import {ExplorerTableDto} from "../../../types/explorer";
import {describe, expect, it} from "vitest";
import {getColumnY, layoutNodes, tableHeight} from "./erdLayout";

const makeTable = (name: string): ExplorerTableDto => ({table_name: name, table_type: 'BASE TABLE'});

describe('layoutNodes', () => {
    it('places isolated tables in a single column', () => {
        const tables = [makeTable('users'), makeTable('posts')];
        const nodes = layoutNodes(tables, {}, []);

        // All isolated tables have depth 0 - same X
        expect(nodes[0].x).toBe(nodes[1].x);
    });

    it('places referenced table to the left of referencing table', () => {
        const tables = [makeTable('orders'), makeTable('users')];
        const fks = [{
            from_table: 'orders',
            from_column: 'user_id',
            to_table: 'users',
            to_column: 'id',
            constraint_name: 'fk_orders_users',
        }];
        const nodes = layoutNodes(tables, {}, fks);

        const orders = nodes.find((n) => n.table.table_name === 'orders')!;
        const users = nodes.find((n) => n.table.table_name === 'users')!;

        // users is referenced (depth 0), orders references it (depth 1) - orders is to the right
        expect(orders.x).toBeGreaterThan(users.x);
    });

    it('returns empty array for empty input', () => {
        expect(layoutNodes([], {}, [])).toEqual([]);
    });

    it('handles self-referencing FK without infinite loop', () => {
        const tables = [makeTable('categories')];
        const fks = [{
            from_table: 'categories',
            from_column: 'parent_id',
            to_table: 'categories',
            to_column: 'id',
            constraint_name: 'fk_self',
        }];
        expect(() => layoutNodes(tables, {}, fks)).not.toThrow();
    });
});

describe('tableHeight', () => {
    it('returns header height + at least one row for empty columns', () => {
        const node = {table: makeTable('t'), details: null, x: 0, y: 0};
        expect(tableHeight(node)).toBeGreaterThan(38);
    });

    it('grows with column count', () => {
        const withCols = {
            table: makeTable('t'),
            details: {
                schema: 'public', table: 't',
                columns: [
                    {column_name: 'id', data_type: 'int', is_nullable: 'NO', column_default: null},
                    {column_name: 'name', data_type: 'varchar', is_nullable: 'YES', column_default: null},
                ],
                indexes: [],
            },
            x: 0, y: 0,
        };
        const withoutCols = {table: makeTable('t'), details: null, x: 0, y: 0};
        expect(tableHeight(withCols)).toBeGreaterThan(tableHeight(withoutCols));
    });
});

describe('getColumnY', () => {
    const node = {
        table: makeTable('t'),
        details: {
            schema: 'public', table: 't',
            columns: [
                {column_name: 'id', data_type: 'int', is_nullable: 'NO', column_default: null},
                {column_name: 'name', data_type: 'varchar', is_nullable: 'YES', column_default: null},
            ],
            indexes: [],
        },
        x: 0, y: 100,
    };

    it('returns y for first column', () => {
        const y = getColumnY(node, 'id');
        expect(y).toBeGreaterThan(100);
    });

    it('returns greater y for second column', () => {
        expect(getColumnY(node, 'name')).toBeGreaterThan(getColumnY(node, 'id'));
    });

    it('falls back to first row for unknown column', () => {
        expect(getColumnY(node, 'unknown')).toBe(getColumnY(node, 'id'));
    });
});
