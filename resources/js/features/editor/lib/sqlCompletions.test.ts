import {describe, expect, it} from "vitest";
import {extractAliases, isSelectContext, isTableContext, resolveTablePrefix} from "./sqlCompletions";

describe('extractAliases', () => {
    it('extracts FROM alias', () => {
        const aliases = extractAliases('SELECT * FROM users u WHERE u.id = 1');
        expect(aliases.get('u')).toBe('users');
    });

    it('extracts JOIN alias', () => {
        const aliases = extractAliases('SELECT * FROM users u JOIN orders o ON u.id = o.user_id');
        expect(aliases.get('u')).toBe('users');
        expect(aliases.get('o')).toBe('orders');
    });

    it('extracts AS alias', () => {
        const aliases = extractAliases('SELECT * FROM users AS u');
        expect(aliases.get('u')).toBe('users');
    })

    it('ignored SQL keywords as aliases', () => {
        const aliases = extractAliases('SELECT * FROM users WHERE id = 1');
        expect(aliases.has('where')).toBe(false);
    });

    it('returns empty map for sql without aliases', () => {
        expect(extractAliases('SELECT * FROM users')).toHaveProperty('size', 0);
    });

    it('is case-insensitive', () => {
        const aliases = extractAliases('SELECT * FROM Users U');
        expect(aliases.get('u')).toBe('users');
    });
});

describe('resolveTablePrefix', () => {
    const items = [
        {schema: 'public', table: 'users', columns: []},
        {schema: 'public', table: 'orders', columns: []},
    ];

    it('resolves alias to matching table', () => {
        const result = resolveTablePrefix('u', 'FROM users u', items);
        expect(result).toHaveLength(1);
        expect(result[0].table).toBe('users');
    })

    it('falls back to all items when alias not found', () => {
        const result = resolveTablePrefix('x', 'FROM users u', items);
        expect(result).toHaveLength(2);
    });

    it('matches by schema name', () => {
        const result = resolveTablePrefix('public', '', items);
        expect(result).toHaveLength(2);
    });
});

describe('isTableContext', () => {
    it('detects FROM context', () => {
        expect(isTableContext('SELECT * FROM ')).toBe(true);
    });

    it('detects JOIN context', () => {
        expect(isTableContext('SELECT * FROM users JOIN ')).toBe(true);
    });

    it('returns false for plain text', () => {
        expect(isTableContext('SELECT id')).toBe(false);
    });
});

describe('isSelectContext', () => {
    it('detects SELECT', () => {
        expect(isSelectContext('SELECT ')).toBe(true);
    });

    it('returns false for FROM', () => {
        expect(isSelectContext('FROM users')).toBe(false);
    });
});
