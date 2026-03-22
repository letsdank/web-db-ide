import {ExplorerForeignKeyDto, ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
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

const TABLE_WIDTH = 220;
const TABLE_HEADER_HEIGHT = 36;
const ROW_HEIGHT = 24;
const TABLE_GAP_X = 80;
const TABLE_GAP_Y = 48;
const TABLES_PER_ROW = 4;

function tableHeight(node: TableNode): number {
    const colCount = node.details?.columns.length ?? 0;
    return TABLE_HEADER_HEIGHT + Math.max(colCount, 1) * ROW_HEIGHT + 8;
}

// Simple left-to-right grid layout, FK-connected tables placed nearby
function layoutNodes(tables: ExplorerTableDto[], detailsMap: Record<string, ExplorerTableDetailsDto>): TableNode[] {
    return tables.map((table, i) => {
        const col = i % TABLES_PER_ROW;
        const row = Math.floor(i / TABLES_PER_ROW);
        return {
            table,
            details: detailsMap[table.table_name] ?? null,
            x: col * (TABLE_WIDTH + TABLE_GAP_X) + 40,
            y: row * (300 + TABLE_GAP_Y) + 40,
        };
    });
}

function getColumnY(node: TableNode, columnName: string): number {
    const idx = node.details?.columns.findIndex((c) => c.column_name === columnName) ?? -1;
    const row = idx >= 0 ? idx : 0;
    return node.y + TABLE_HEADER_HEIGHT + row * ROW_HEIGHT + ROW_HEIGHT / 2;
}

function FkLine({from, to, fk, nodes}: {
    from: TableNode;
    to: TableNode;
    fk: ExplorerForeignKeyDto;
    nodes: TableNode[];
}) {
    const x1 = from.x + TABLE_WIDTH;
    const y1 = getColumnY(from, fk.from_column);
    const x2 = to.x;
    const y2 = getColumnY(to, fk.to_column);

    // If target is to the left, flip the connection sides
    const startX = from.x + (from.x < to.x ? TABLE_WIDTH : 0);
    const endX = to.x + (from.x < to.x ? 0 : TABLE_WIDTH);
    const dx = Math.abs(endX - startX) * 0.5;

    const d = `M ${startX} ${y1} C ${startX + (from.x < to.x ? dx : -dx)} ${y1}, ${endX + (from.x < to.x ? -dx : dx)} ${y2}, ${endX} ${y2}`;

    return (
        <g>
            <path d={d} fill="none" stroke="var(--g-color-base-brand)" strokeWidth={1.5} strokeOpacity={0.6}/>
            <circle cx={endX} cy={y2} r={3} fill="var(--g-color-base-brand)"/>
        </g>
    );
}

function TableCard({node}: { node: TableNode }) {
    const h = tableHeight(node);
    const columns = node.details?.columns ?? [];
    const indexes = node.details?.indexes ?? [];
    const pkColumns = new Set(
        indexes
            .filter((idx) => idx.indexname === 'PRIMARY' || idx.indexdef?.toLowerCase().includes('primary'))
            .flatMap((idx) => {
                const match = idx.indexdef?.match(/\(([^)]+)\)/);
                return match ? match[1].split(',').map((s) => s.trim()) : [];
            }),
    );

    return (
        <g transform={`translate(${node.x}, ${node.y}`}>
            {/* Table card background */}
            <rect
                width={TABLE_WIDTH}
                height={h}
                rx={6}
                fill="var(--g-color-base-float)"
                stroke="var(--g-color-line-generic)"
                strokeWidth={1}
            />

            {/* Header */}
            <rect
                width={TABLE_WIDTH}
                height={TABLE_HEADER_HEIGHT}
                rx={6}
                fill="var(--g-color-base-brand-hover)"
            />
            <rect
                y={TABLE_HEADER_HEIGHT - 6}
                width={TABLE_WIDTH}
                height={6}
                fill="var(--g-color-base-brand-hover)"
            />
            <text
                x={12}
                y={TABLE_HEADER_HEIGHT / 2 + 5}
                fontSize={13}
                fontWeight={600}
                fill="var(--g-color-text-brand-heavy)"
                fontFamily="var(--g-font-family-sans)"
            >
                {node.table.table_name}
            </text>

            {/* Columns */}
            {columns.length === 0 ? (
                <text x={12} y={TABLE_HEADER_HEIGHT + ROW_HEIGHT / 2 + 5} fontSize={11}
                      fill="var(--g-color-text-secondary)" fontFamily="var(--g-font-family-sans)">
                    no columns
                </text>
            ) : (
                columns.map((col, i) => {
                    const isPk = pkColumns.has(col.column_name);
                    const cy = TABLE_HEADER_HEIGHT + i * ROW_HEIGHT;

                    return (
                        <g key={col.column_name}>
                            {i % 2 === 0 && (
                                <rect y={cy} width={TABLE_WIDTH} height={ROW_HEIGHT}
                                      fill="var(--g-color-base-float-hover)"/>
                            )}
                            <text
                                x={isPk ? 22 : 12}
                                y={cy + ROW_HEIGHT / 2 + 4}
                                fontSize={11}
                                fill={isPk ? 'var(--g-color-text-brand)' : 'var(--g-color-text-primary)'}
                                fontFamily="var(--g-font-family-sans)"
                                fontWeight={isPk ? 600 : 400}
                            >
                                {col.column_name}
                            </text>
                            {isPk && (
                                <text x={12} y={cy + ROW_HEIGHT / 2 + 4} fontSize={10} fill="var(--g-color-text-brand)"
                                      fontFamily="var(--g-font-family-sans)">
                                    🔑
                                </text>
                            )}
                            <text
                                x={TABLE_WIDTH - 8}
                                y={cy + ROW_HEIGHT / 2 + 4}
                                fontSize={10}
                                fill="var(--g-color-text-secondary)"
                                fontFamily="var(--g-font-family-sans)"
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

                const nodes = layoutNodes(tables, detailsMap);
                setErdData({nodes, foreignKeys});
            } catch (e) {
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

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setTransform((prev) => ({
            ...prev,
            scale: Math.min(Math.max(prev.scale * delta, 0.2), 3),
        }));
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

    // Canvas size - enough to fit all nodes
    const maxX = Math.max(...nodes.map((n) => n.x + TABLE_WIDTH)) + 40;
    const maxY = Math.max(...nodes.map((n) => n.y + tableHeight(n))) + 40;

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
                <button className="erd-pane__reset" onClick={handleReset}>
                    Reset view
                </button>
            </div>

            <svg
                width="100%"
                height="100%"
                style={{display: 'block'}}
            >
                <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
                    {/* FK lines rendered below table card */}
                    {foreignKeys.map((fk) => {
                        const from = nodeMap[fk.from_table];
                        const to = nodeMap[fk.to_table];
                        if (!from || !to || from === to) return null;

                        return (
                            <FkLine
                                key={fk.constraint_name}
                                from={from}
                                to={to}
                                fk={fk}
                                nodes={nodes}
                            />
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
