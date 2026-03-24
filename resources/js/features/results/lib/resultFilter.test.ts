import {describe, expect, it} from "vitest";
import {parseResultFilter, rowMatchesResultFilter} from "./resultFilter";

const columns = [
    {name: 'id', originalIndex: 0},
    {name: 'name', originalIndex: 1},
    {name: 'email', originalIndex: 2},
    {name: 'age', originalIndex: 3},
];

describe('parseResultFilter', () => {
    it('parses plain terms', () => {
        expect(parseResultFilter('alice admin')).toEqual([
            {type: 'term', value: 'alice'},
            {type: 'term', value: 'admin'},
        ]);
    });

    it('parses quoted terms as single tokens', () => {
        expect(parseResultFilter('"alice cooper"')).toEqual([
            {type: 'term', value: 'alice cooper'},
        ]);
    });

    it('parses column filters and null operators', () => {
        expect(parseResultFilter('name:alice is:null is:not-null')).toEqual([
            {type: 'column', columnName: 'name', value: 'alice'},
            {type: 'null'},
            {type: 'not-null'},
        ]);
    });
});

describe('rowMatchesResultFilter', () => {
    const row = [15, 'Alice Cooper', 'alice@example.com', null];

    it('returns true when filter is ready', () => {
        expect(rowMatchesResultFilter(row, columns, '')).toBe(true);
    });

    it('matches a plain term across visible columns', () => {
        expect(rowMatchesResultFilter(row, columns, 'cooper')).toBe(true);
        expect(rowMatchesResultFilter(row, columns, 'missing')).toBe(false);
    });

    it('matches quoted phrases', () => {
        expect(rowMatchesResultFilter(row, columns, '"alice cooper"')).toBe(true);
    });

    it('matches column-specific filters', () => {
        expect(rowMatchesResultFilter(row, columns, 'name:alice')).toBe(true);
        expect(rowMatchesResultFilter(row, columns, 'email:gmail')).toBe(false);
    });

    it('matches null and not-null operators', () => {
        expect(rowMatchesResultFilter(row, columns, 'is:null')).toBe(true);
        expect(rowMatchesResultFilter(row, columns, 'is:not-null')).toBe(true);
    });

    it('requires every token to match', () => {
        expect(rowMatchesResultFilter(row, columns, 'alice email:example')).toBe(true);
        expect(rowMatchesResultFilter(row, columns, 'alice email:gmail')).toBe(false);
    });

    it('returns false when column token references an unknown column', () => {
        expect(rowMatchesResultFilter(row, columns, 'role:admin')).toBe(false);
    });
});
