import {describe, expect, it} from "vitest";
import {buildCountSql, buildPreviewSql, buildSelectSql, qualifyTableName} from "./sql";

describe('explorer sql helpers', () => {
    it('qualifies a table name with quoted schema and table', () => {
        expect(qualifyTableName('public', 'users'))
            .toBe('"public"."users"');
    });

    it('quotes identifier parts safely', () => {
        expect(qualifyTableName('pub"lic', 'us"ers'))
            .toBe('"pub""lic"."us""ers"');
    });

    it('returns only quoted table when schema is empty', () => {
        expect(qualifyTableName(null, 'users'))
            .toBe('"users"');

        expect(qualifyTableName(undefined, 'users'))
            .toBe('"users"');
    });

    it('builds preview sql with default limit', () => {
        expect(buildPreviewSql('public', 'users', 250)).toBe(
            'select *\nfrom "public"."users"\nlimit 250;'
        );
    });

    it('builds count sql', () => {
        expect(buildCountSql('public', 'users')).toBe(
            'select count(*) as total_rows\nfrom "public"."users";'
        );
    });

    it('builds select sql', () => {
        expect(buildSelectSql('public', 'users')).toBe(
            'select *\nfrom "public"."users";'
        );
    });
});
