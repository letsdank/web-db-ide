import type {ExplorerForeignKeyDto, ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {fetchForeignKeys, fetchTableDetails, fetchTables} from "../../../api/explorer";
import {Loader, Text} from "@gravity-ui/uikit";

interface TableNode {
    table: ExplorerTableDto;
    details: ExplorerTableDetailsDto | null;
    x: number;
    y: number;
}

interface ErdData {
    nodes: TableNode[];
    foreignKeys: ExplorerForeignKeyDto[];
}

interface Transform {
    x: number;
    y: number;
    scale: number;
}

const TABLE_WIDTH = 240;
const TABLE_HEADER_HEIGHT = 38;
const ROW_HEIGHT = 22;
const COL_GAP = 100;
const ROW_GAP = 32;
const PAD = 48;

function tableHeight(node: TableNode): number {
    const colCount = node.details?.columns.length ?? 0;
    return TABLE_HEADER_HEIGHT + Math.max(colCount, 1) * ROW_HEIGHT + 6;
}

// Topological layout: tables that are referenced by others go to the left,
// leaf tables (no one references them) go to the right.
function layoutNodes(
    tables: ExplorerTableDto[],
    detailsMap: Record<string, ExplorerTableDetailsDto>,
    foreignKeys: ExplorerForeignKeyDto[],
): TableNode[] {
    // Build in-degree map (how many tables reference this table)
    const inDegree = new Map<string, number>();
    const outEdges = new Map<string, Set<string>>();

    for (const t of tables) {
        inDegree.set(t.table_name, 0);
        outEdges.set(t.table_name, new Set());
    }

    for (const fk of foreignKeys) {
        if (fk.from_table === fk.to_table) continue;
        outEdges.get(fk.from_table)?.add(fk.to_table);
        inDegree.set(fk.to_table, (inDegree.get(fk.to_table) ?? 0) + 1);
    }

    // BFS-based depth assignment (Kahn's algorithm)
    const depth = new Map<string, number>();
    const queue: string[] = [];

    for (const t of tables) {
        if ((inDegree.get(t.table_name) ?? 0) === 0) {
            queue.push(t.table_name);
            depth.set(t.table_name, 0);
        }
    }

    while (queue.length > 0) {
        const name = queue.shift()!;
        const d = depth.get(name) ?? 0;

        for (const neighbor of outEdges.get(name) ?? []) {
            const existing = depth.get(neighbor) ?? -1;
            if (d + 1 > existing) {
                depth.set(neighbor, d + 1);
                queue.push(neighbor);
            }
        }
    }

    // Group tables by depth column
    const byDepth = new Map<number, ExplorerTableDto[]>();
    for (const t of tables) {
        const d = depth.get(t.table_name) ?? 0;
        if (!byDepth.has(d)) byDepth.set(d, []);
        byDepth.get(d)!.push(t);
    }

    // Sort columns by depth, sort tables within column by name
    const depthKeys = Array.from(byDepth.keys()).sort((a, b) => a - b);

    // Compute column X positions based on max table width (all same width here)
    const nodes: TableNode[] = [];
    let colX = PAD;

    for (const d of depthKeys) {
        const col = byDepth.get(d)!.sort((a, b) => a.table_name.localeCompare(b.table_name));
        let rowY = PAD;

        for (const table of col) {
            const node: TableNode = {
                table,
                details: detailsMap[table.table_name] ?? null,
                x: colX,
                y: rowY,
            };
            nodes.push(node);
            rowY += tableHeight(node) + ROW_GAP;
        }

        colX += TABLE_WIDTH + COL_GAP;
    }

    return nodes;
}

function getColumnY(node: TableNode, columnName: string): number {
    const idx = node.details?.columns.findIndex((c) => c.column_name === columnName) ?? -1;
    const row = idx >= 0 ? idx : 0;
    return node.y + TABLE_HEADER_HEIGHT + row * ROW_HEIGHT + ROW_HEIGHT / 2;
}

function PkIcon({x, y}: { x: number; y: number }) {
    // Small SVG key icon: circle + shaft
    return (
        <g transform={`translate(${x}, ${y - 5})`}>
            <circle cx={4} cy={4} r={3} fill="none" stroke="#e0af68" strokeWidth={1.5}/>
            <line x1={6.5} y1={5.5} x2={11} y2={5.5} stroke="#e0af68" strokeWidth={1.5} strokeLinecap="round"/>
            <line x1={9} y1={5.5} x2={9} y2={7.5} stroke="#e0af68" strokeWidth={1.5} strokeLinecap="round"/>
            <line x1={11} y1={5.5} x2={11} y2={7.5} stroke="#e0af68" strokeWidth={1.5} strokeLinecap="round"/>
        </g>
    )
}

function FkLine({from, to, fk}: {
    from: TableNode;
    to: TableNode;
    fk: ExplorerForeignKeyDto;
}) {
    const y1 = getColumnY(from, fk.from_column);
    const y2 = getColumnY(to, fk.to_column);

    // If target is to the left, flip the connection sides
    const startX = from.x + (from.x <= to.x ? TABLE_WIDTH : 0);
    const endX = to.x + (from.x <= to.x ? 0 : TABLE_WIDTH);
    const dx = Math.max(Math.abs(endX - startX) * 0.5, 40);
    const sign = from.x <= to.x ? 1 : -1;

    const d = `M ${startX} ${y1} C ${startX + sign * dx} ${y1}, ${endX - sign * dx} ${y2}, ${endX} ${y2}`;

    return (
        <g>
            <path d={d} fill="none" stroke="var(--erd-fk-line)" strokeWidth={1.5} strokeOpacity={0.5}/>
            {/* Arrow at target */}
            <circle cx={endX} cy={y2} r={3.5} fill="var(--erd-fk-line)" fillOpacity={0.8}/>
        </g>
    );
}

function TableCard({node}: { node: TableNode }) {
    const h = tableHeight(node);
    const columns = node.details?.columns ?? [];
    const indexes = node.details?.indexes ?? [];

    const pkColumns = new Set(
        indexes
            .filter((idx) =>
                idx.indexname === 'PRIMARY' ||
                idx.indexdef?.toLowerCase().includes('primary key'))
            .flatMap((idx) => {
                const match = idx.indexdef?.match(/\(([^)]+)\)/);
                return match ? match[1].split(',').map((s) => s.trim().replace(/"/g, '')) : [];
            }),
    );

    return (
        <g transform={`translate(${node.x}, ${node.y})`}>
            {/* Card shadow */}
            <rect width={TABLE_WIDTH} height={h} rx={7} fill="rgba(0,0,0,0.25)" transform="translate(2,3)"/>

            {/* Card background */}
            <rect
                width={TABLE_WIDTH}
                height={h}
                rx={7}
                fill="var(--erd-card-bg)"
                stroke="var(--erd-card-border)"
                strokeWidth={1}
            />

            {/* Header background */}
            <rect width={TABLE_WIDTH} height={TABLE_HEADER_HEIGHT} rx={7} fill="var(--erd-header-bg)"/>
            <rect
                y={TABLE_HEADER_HEIGHT - 7}
                width={TABLE_WIDTH}
                height={7}
                fill="var(--erd-header-bg)"
            />

            {/* Header text */}
            <text
                x={12}
                y={TABLE_HEADER_HEIGHT / 2 + 5}
                fontSize={12}
                fontWeight={700}
                fill="var(--erd-header-text)"
                fontFamily="var(--g-font-family-monospace, monospace)"
                letterSpacing={0.3}
            >
                {node.table.table_name}
            </text>

            {/* Columns */}
            {columns.length === 0 ? (
                <text
                    x={12}
                    y={TABLE_HEADER_HEIGHT + ROW_HEIGHT / 2 + 5}
                    fontSize={11}
                    fill="var(--erd-text-secondary)"
                    fontFamily="var(--g-font-family-sans)"
                >
                    no columns
                </text>
            ) : (
                columns.map((col, i) => {
                    const isPk = pkColumns.has(col.column_name);
                    const cy = TABLE_HEADER_HEIGHT + i * ROW_HEIGHT;

                    return (
                        <g key={col.column_name}>
                            {/* Alternating row background */}
                            {i % 2 === 1 && (
                                <rect y={cy} width={TABLE_WIDTH} height={ROW_HEIGHT} fill="var(--erd-row-alt)"/>
                            )}

                            {/* PK icon */}
                            {isPk && <PkIcon x={8} y={cy + ROW_HEIGHT / 2}/>}

                            {/* Column name */}
                            <text
                                x={isPk ? 26 : 12}
                                y={cy + ROW_HEIGHT / 2 + 4}
                                fontSize={11}
                                fill={isPk ? '#e0af68' : 'var(--erd-text'}
                                fontFamily="var(--g-font-family-sans)"
                                fontWeight={isPk ? 600 : 400}
                            >
                                {col.column_name}
                            </text>

                            {/* Data type */}
                            <text
                                x={TABLE_WIDTH - 8}
                                y={cy + ROW_HEIGHT / 2 + 4}
                                fontSize={10}
                                fill="var(--erd-text-secondary)"
                                fontFamily="var(--g-font-family-monospace, monospace)"
                                textAnchor="end"
                            >
                                {col.data_type}
                            </text>
                        </g>
                    );
                })
            )}
        </g>
    );
}

interface Props {
    connectionId: number;
    schema: string;
}

export function ErdPane({connectionId, schema}: Props) {
    const [erdData, setErdData] = useState<ErdData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [transform, setTransform] = useState<Transform>({x: 0, y: 0, scale: 1});
    const isPanning = useRef(false);
    const lastPointer = useRef({x: 0, y: 0});
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const [tables, foreignKeys] = await Promise.all([
                    fetchTables(connectionId, schema),
                    fetchForeignKeys(connectionId, schema),
                ]);

                const detailsResults = await Promise.all(
                    tables.map((t) => fetchTableDetails(connectionId, schema, t.table_name).catch(() => null)),
                );

                if (cancelled) return;

                const detailsMap: Record<string, ExplorerTableDetailsDto> = {};
                tables.forEach((t, i) => {
                    const d = detailsResults[i];
                    if (d) detailsMap[t.table_name] = d;
                });

                const nodes = layoutNodes(tables, detailsMap, foreignKeys);
                setErdData({nodes, foreignKeys});
            } catch (_e) {
                if (!cancelled) setError('Failed to load schema data.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, [connectionId, schema]);

    // Zoom towards cursor position
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setTransform((prev) => {
            const newScale = Math.min(Math.max(prev.scale * delta, 0.15), 4);
            const ratio = newScale / prev.scale;
            return {
                x: mouseX - ratio * (mouseX - prev.x),
                y: mouseY - ratio * (mouseY - prev.y),
                scale: newScale,
            };
        });
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        isPanning.current = true;
        lastPointer.current = {x: e.clientX, y: e.clientY};
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isPanning.current) return;
        const dx = e.clientX - lastPointer.current.x;
        const dy = e.clientY - lastPointer.current.y;
        lastPointer.current = {x: e.clientX, y: e.clientY};
        setTransform((prev) => ({...prev, x: prev.x + dx, y: prev.y + dy}));
    }, []);

    const handlePointerUp = useCallback(() => {
        isPanning.current = false;
    }, []);

    const handleReset = useCallback(() => {
        setTransform({x: 0, y: 0, scale: 1});
    }, []);

    if (loading) {
        return (
            <div className="erd-pane erd-pane--loading">
                <Loader size="m"/>
                <Text variant="body-2" color="secondary">Loading schema...</Text>
            </div>
        );
    }

    if (error || !erdData) {
        return (
            <div className="erd-pane erd-pane--error">
                <Text variant="body-2" color="danger">{error ?? 'Unknown error'}</Text>
            </div>
        );
    }

    const {nodes, foreignKeys} = erdData;
    const nodeMap = Object.fromEntries(nodes.map((n) => [n.table.table_name, n]));

    return (
        <div
            ref={containerRef}
            className="erd-pane"
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{cursor: isPanning.current ? 'grabbing' : 'grab'}}
        >
            <div className="erd-pane__toolbar">
                <Text variant="caption-2" color="secondary">
                    {schema} · {nodes.length} tables · {foreignKeys.length} FK
                </Text>
                <Text variant="caption-2" color="secondary">
                    {Math.round(transform.scale * 100)}%
                </Text>
                <button className="erd-pane__reset" onClick={handleReset}>
                    Reset view
                </button>
            </div>

            <svg width="100%" height="100%" style={{display: 'block'}}>
                <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
                    {/* FK lines rendered below table card */}
                    {foreignKeys.map((fk) => {
                        const from = nodeMap[fk.from_table];
                        const to = nodeMap[fk.to_table];
                        if (!from || !to || from === to) return null;

                        return (
                            <FkLine key={fk.constraint_name} from={from} to={to} fk={fk}/>
                        );
                    })}

                    {nodes.map((node) => (
                        <TableCard key={node.table.table_name} node={node}/>
                    ))}
                </g>
            </svg>
        </div>
    );
}
