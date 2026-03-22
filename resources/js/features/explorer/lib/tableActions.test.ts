import {describe, expect, it} from "vitest";
import {
    buildErdTabInput,
    buildExplorerCountTabInput,
    buildExplorerMetadataSqlText,
    buildExplorerMetadataTabInput,
    buildExplorerPreviewTabInput,
    buildExplorerSelectSql,
    formatExplorerColumnLine
} from "./tableActions";

describe('explorer table actions', () => {
    it('builds preview tab input for postgres', () => {
        expect(buildExplorerPreviewTabInput({
            connectionId: 10,
            driver: 'pgsql',
            schema: 'public',
            table: 'users',
        }, 250)).toEqual({
            title: 'users Preview',
            sql_text: 'select *\nfrom "public"."users"\nlimit 250;',
            db_connection_id: 10,
        });
    });

    it('builds count tab input for mysql', () => {
        expect(buildExplorerCountTabInput({
            connectionId: 7,
            driver: 'mysql',
            schema: 'app',
            table: 'orders',
        })).toEqual({
            title: 'orders Count',
            sql_text: 'select count(*) as total_rows\nfrom `app`.`orders`;',
            db_connection_id: 7,
        });
    });

    it('builds select sql via driver-aware dialect', () => {
        expect(buildExplorerSelectSql({
            connectionId: 1,
            driver: 'mysql',
            schema: 'analytics',
            table: 'events',
        })).toBe('select *\nfrom `analytics`.`events`;');
    });

    it('formats nullable and not-null columns correctly', () => {
        expect(formatExplorerColumnLine({
            column_name: 'id',
            data_type: 'bigint',
            is_nullable: 'NO',
            column_default: null,
        })).toBe('id bigint not null');

        expect(formatExplorerColumnLine({
            column_name: 'email',
            data_type: 'varchar',
            is_nullable: 'YES',
            column_default: null,
        })).toBe('email varchar');
    });

    it('includes default value in formatted column line', () => {
        expect(formatExplorerColumnLine({
            column_name: 'created_at',
            data_type: 'timestamp',
            is_nullable: 'NO',
            column_default: 'CURRENT_TIMESTAMP',
        })).toBe('created_at timestamp not null default CURRENT_TIMESTAMP');
    });

    it('builds metadata sql text with header and columns', () => {
        expect(buildExplorerMetadataSqlText('public', 'users', [
            {
                column_name: 'id',
                data_type: 'bigint',
                is_nullable: 'NO',
                column_default: null,
            },
            {
                column_name: 'email',
                data_type: 'varchar',
                is_nullable: 'YES',
                column_default: null,
            },
        ])).toBe('-- public.users\nid bigint not null\nemail varchar');
    });

    it('builds metadata fallback when no columns are available', () => {
        expect(buildExplorerMetadataSqlText('public', 'users', []))
            .toBe('-- public.users\n-- no columns available');
    });

    it('builds metadata tab input', () => {
        expect(buildExplorerMetadataTabInput({
            connectionId: 3,
            driver: 'pgsql',
            schema: 'public',
            table: 'users',
        }, [
            {
                column_name: 'id',
                data_type: 'bigint',
                is_nullable: 'NO',
                column_default: null,
            },
        ])).toEqual({
            title: 'users Columns',
            sql_text: '-- public.users\nid bigint not null',
            db_connection_id: 3,
        });
    });

    it('builds erd tab input with correct type and meta', () => {
        expect(buildErdTabInput({connectionId: 5, schema: 'public'})).toEqual({
            title: 'public ERD',
            sql_text: '',
            db_connection_id: 5,
            tab_type: 'erd',
            meta: {
                connectionId: 5,
                schema: 'public',
            },
        });
    });
});
