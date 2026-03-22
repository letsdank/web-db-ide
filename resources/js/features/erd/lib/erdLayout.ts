import type {ExplorerForeignKeyDto, ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";

export interface TableNode {
    table: ExplorerTableDto;
    details: ExplorerTableDetailsDto | null;
    x: number;
    y: number;
}

export const TABLE_WIDTH = 240;
export const TABLE_HEADER_HEIGHT = 38;
export const ROW_HEIGHT = 22;
const COL_GAP = 100;
const ROW_GAP = 32;
const PAD = 48;

export function tableHeight(node: TableNode): number {
    const colCount = node.details?.columns.length ?? 0;
    return TABLE_HEADER_HEIGHT + Math.max(colCount, 1) * ROW_HEIGHT + 6;
}

export function getColumnY(node: TableNode, columnName: string): number {
    const idx = node.details?.columns.findIndex((c) => c.column_name === columnName) ?? -1;
    const row = idx >= 0 ? idx : 0;
    return node.y + TABLE_HEADER_HEIGHT + row * ROW_HEIGHT + ROW_HEIGHT / 2;
}

// Topological layout: tables that are referenced by others go to the left,
// leaf tables (no one references them) go to the right.
export function layoutNodes(
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
        outEdges.get(fk.to_table)?.add(fk.from_table);
        inDegree.set(fk.from_table, (inDegree.get(fk.from_table) ?? 0) + 1);
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
