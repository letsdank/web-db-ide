import {describe, expect, it} from "vitest";
import {
    normalizeExplorerColumn,
    normalizeExplorerIndex,
    normalizeExplorerTable,
    normalizeExplorerTableDetails
} from "./explorer";

describe('explorer api normalizers', () => {
    it('normalizes table dto', () => {
        expect(normalizeExplorerTable({
            table_name: 'users',
            table_type: 'BASE TABLE',
        })).toEqual({
            table_name: 'users',
            table_type: 'BASE TABLE',
        });

        expect(normalizeExplorerTable({})).toEqual({
            table_name: '',
            table_type: '',
        });
    });

    it('normalizes column dto', () => {
        expect(normalizeExplorerColumn({
            column_name: 'id',
            data_type: 'bigint',
            is_nullable: 'NO',
            column_default: null,
        })).toEqual({
            column_name: 'id',
            data_type: 'bigint',
            is_nullable: 'NO',
            column_default: null,
        });

        expect(normalizeExplorerColumn({
            column_name: 'payload',
            is_nullable: 'wat',
            column_default: 123,
        })).toEqual({
            column_name: 'payload',
            data_type: 'unknown',
            is_nullable: 'YES',
            column_default: '123',
        });
    })

    it('normalizes index dto', () => {
        expect(normalizeExplorerIndex({
            indexname: 'users_pkey',
            indexdef: 'PRIMARY KEY (id)',
        })).toEqual({
            indexname: 'users_pkey',
            indexdef: 'PRIMARY KEY (id)',
        });

        expect(normalizeExplorerIndex({})).toEqual({
            indexname: '',
            indexdef: '',
        });
    });

    it('normalizes table details dto', () => {
        expect(normalizeExplorerTableDetails({
            schema: 'public',
            table: 'users',
            columns: [
                {
                    column_name: 'id',
                    data_type: 'bigint',
                    is_nullable: 'NO',
                    column_default: null,
                },
            ],
            indexes: [
                {
                    indexname: 'users_pkey',
                    indexdef: 'PRIMARY KEY (id)',
                },
            ],
        })).toEqual({
            schema: 'public',
            table: 'users',
            columns: [
                {
                    column_name: 'id',
                    data_type: 'bigint',
                    is_nullable: 'NO',
                    column_default: null,
                },
            ],
            indexes: [
                {
                    indexname: 'users_pkey',
                    indexdef: 'PRIMARY KEY (id)',
                },
            ],
        });
    });
});
