import {describe, expect, it} from "vitest";
import {isPotentiallyDestructiveSql, stripSqlComments, truncateSqlPreview} from "./useWorkspaceExecution";

describe('stripSqlComments', () => {
    it('removes line comments', () => {
        const sql = `
            -- comment
            select *
            from users -- tail
            where active = true;
        `;

        expect(stripSqlComments(sql)).toContain('select *');
        expect(stripSqlComments(sql)).not.toContain('--');
        expect(stripSqlComments(sql)).not.toContain('comment');
    });

    it('removes block comments', () => {
        const sql = `
            /* dangerous?
               maybe not
            */
            select * from users;
        `;

        const result = stripSqlComments(sql);

        expect(result).toContain('select * from users;');
        expect(result).not.toContain('dangerous');
        expect(result).not.toContain('/*');
    });

    it('keeps non-comment sql content', () => {
        const sql = 'select * from users where name = \'--not a comment\';';
        const result = stripSqlComments(sql);

        expect(result).toContain('select * from users');
    });
});

describe('isPotentiallyDestructiveSql', () => {
    it('returns false for harmless select query', () => {
        expect(isPotentiallyDestructiveSql('select * from users;')).toBe(false);
    });

    it('returns true for delete query', () => {
        expect(isPotentiallyDestructiveSql('delete from users where id = 1;')).toBe(true);
    });

    it('returns true for update query', () => {
        expect(isPotentiallyDestructiveSql('update users set active = false;')).toBe(true);
    });

    it('returns true for drop query', () => {
        expect(isPotentiallyDestructiveSql('drop table users;')).toBe(true);
    });

    it('ignores destructive keywords inside comments', () => {
        const sql = `
            -- delete from users;
            /* drop table users; */
            select * from users;
        `;

        expect(isPotentiallyDestructiveSql(sql)).toBe(false);
    });

    it('matches keywords case-insensitively', () => {
        expect(isPotentiallyDestructiveSql('TrUnCaTe table audit_log;')).toBe(true);
    });

    it('does not match partial words', () => {
        expect(isPotentiallyDestructiveSql('select updated_at from users;')).toBe(false);
        expect(isPotentiallyDestructiveSql('select created_by from users;')).toBe(false);
    });

    it('returns false for empty sql', () => {
        expect(isPotentiallyDestructiveSql('   ')).toBe(false);
    });
});

describe('truncateSqlPreview', () => {
    it('returns compact sql unchanged when below limit',()=>{
        expect(
            truncateSqlPreview('select   *   from   users;', 100),
        ).toBe('select * from users;');
    });

    it('collapses whitespace before truncation',()=>{
        expect(
            truncateSqlPreview(`
                select
                    *
                from
                    users
            `, 100),
        ).toBe('select * from users');
    });

    it('truncates long sql and appends ellipsis',()=>{
        const sql = 'select * from users where ' + 'x = 1 '.repeat(100);
        const result = truncateSqlPreview(sql,40);

        expect(result.endsWith('...')).toBe(true);
        expect(result.length).toBe(43);
    });
});
