import {describe, expect, it} from "vitest";
import {buildCountSql, buildPreviewSql, buildSelectSql, qualifyTableName} from "./sql";

describe('explorer sql helpers', () => {
    it('qualifies a postgres table name with quoted schema and table', () => {
        expect(qualifyTableName('pgsql', 'public', 'users'))
            .toBe('"public"."users"');
    });

    it('quotes postgres identifier parts safely', () => {
        expect(qualifyTableName('pgsql', 'pub"lic', 'us"ers'))
            .toBe('"pub""lic"."us""ers"');
    });

    it('qualifies a mysql table name with backticks', () => {
        expect(qualifyTableName('mysql', 'app', 'users'))
            .toBe('`app`.`users`');
    });

    it('quotes mysql identifier parts safely', () => {
        expect(qualifyTableName('mysql', 'ap`p', 'us`ers'))
            .toBe('`ap``p`.`us``ers`');
    });

    it('returns only quoted table when schema is empty', () => {
        expect(qualifyTableName('pgsql', null, 'users'))
            .toBe('"users"');

        expect(qualifyTableName('mysql', undefined, 'users'))
            .toBe('`users`');
    });

    it('builds postgres preview sql with default limit', () => {
        expect(buildPreviewSql('pgsql', 'public', 'users', 250)).toBe(
            'select *\nfrom "public"."users"\nlimit 250;'
        );
    });

    it('builds mysql preview sql with default limit', () => {
        expect(buildPreviewSql('mysql', 'app', 'users', 250)).toBe(
            'select *\nfrom `app`.`users`\nlimit 250;'
        );
    });

    it('builds postgres count sql', () => {
        expect(buildCountSql('pgsql', 'public', 'users')).toBe(
            'select count(*) as total_rows\nfrom "public"."users";'
        );
    });

    it('builds mysql count sql', () => {
        expect(buildCountSql('mysql', 'app', 'users')).toBe(
            'select count(*) as total_rows\nfrom `app`.`users`;'
        );
    })

    it('builds postgres select sql', () => {
        expect(buildSelectSql('pgsql', 'public', 'users')).toBe(
            'select *\nfrom "public"."users";'
        );
    });

    it('builds mysql select sql', () => {
        expect(buildSelectSql('mysql', 'app', 'users')).toBe(
            'select *\nfrom `app`.`users`;'
        );
    });
});
