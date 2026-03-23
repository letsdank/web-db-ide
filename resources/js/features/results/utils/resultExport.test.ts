import {describe, expect, it} from "vitest";
import {buildCsv, buildExportFileName, buildRowJson, buildRowTsv, buildTsv, escapeCsvValue} from "./resultExport";

const columns = [
    {name: 'id', native_type: 'int'},
    {name: 'name', native_type: 'varchar'},
    {name: 'email', native_type: 'varchar'},
];

describe('escapeCsvValue', () => {
    it('returns empty string for null', () => {
        expect(escapeCsvValue(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
        expect(escapeCsvValue(undefined)).toBe('');
    });

    it('wraps value containing comma in quotes', () => {
        expect(escapeCsvValue('hello, world')).toBe('"hello, world"');
    });

    it('escapes double quotes by doubling them', () => {
        expect(escapeCsvValue('say "hello"')).toBe('"say ""hello"""');
    });

    it('wraps value containing newline in quotes', () => {
        expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"');
    });

    it('returns plain string for simple values', () => {
        expect(escapeCsvValue('hello')).toBe('hello');
        expect(escapeCsvValue(42)).toBe('42');
    });
});

describe('buildCsv', () => {
    it('builds header from column names', () => {
        const csv = buildCsv(columns, []);
        expect(csv).toBe('id,name,email');
    });

    it('builds rows correctly', () => {
        const csv = buildCsv(columns, [[1, 'Alice', 'alice@example.com']]);
        expect(csv).toBe('id,name,email\n1,Alice,alice@example.com');
    });

    it('handles null cells as empty', () => {
        const csv = buildCsv(columns, [[1, null, null]]);
        expect(csv).toBe('id,name,email\n1,,');
    });

    it('escapes values with commas', () => {
        const csv = buildCsv(columns, [[1, 'Doe, John', 'john@example.com']]);
        expect(csv).toContain('"Doe, John"');
    });
});

describe('buildTsv', () => {
    it('joins columns with tab', () => {
        const tsv = buildTsv(columns, [[1, 'Alice', 'alice@example.com']]);
        const [header, row] = tsv.split('\n');
        expect(header).toBe('id\tname\temail');
        expect(row).toBe('1\tAlice\talice@example.com');
    });

    it('renders null as NULL', () => {
        const tsv = buildTsv(columns, [[1, null, null]]);
        expect(tsv).toContain('NULL');
    });
});

describe('buildRowTsv', () => {
    it('joins row values with tab', () => {
        expect(buildRowTsv([1, 'Alice', 'alice@example.com'])).toBe('1\tAlice\talice@example.com');
    });

    it('renders null as NULL', () => {
        expect(buildRowTsv([1, null])).toBe('1\tNULL');
    });
});

describe('buildRowJson', () => {
    it('maps column names to row values', () => {
        const result = JSON.parse(buildRowJson([1, 'Alice'], ['id', 'name']));
        expect(result).toEqual({id: 1, name: 'Alice'});
    });

    it('uses null for missing values', () => {
        const result = JSON.parse(buildRowJson([1], ['id', 'name']));
        expect(result).toEqual({id: 1, name: null});
    });

    it('handles null cells', () => {
        const result = JSON.parse(buildRowJson([1, null], ['id', 'name']));
        expect(result).toEqual({id: 1, name: null});
    });
});

describe('buildExportFileName', () => {
    it('builds filename from tab title and extension', () => {
        expect(buildExportFileName('My Query', 'csv')).toBe('my-query.csv');
    });

    it('falls back to query-results when title is null', () => {
        expect(buildExportFileName(null, 'json')).toBe('query-results.json');
    });

    it('falls back to query-results when title is empty string', () => {
        expect(buildExportFileName('', 'tsv')).toBe('query-results.tsv');
    });

    it('strips leading and trailing dashes', () => {
        expect(buildExportFileName('  my query  ', 'csv')).toBe('my-query.csv');
    });

    it('replaces special characters with dashes', () => {
        expect(buildExportFileName('users & orders (2024)', 'csv')).toBe('users-orders-2024.csv');
    });

    it('collapses multiple consecutive special chars into single dash', () => {
        expect(buildExportFileName('a  b   c', 'csv')).toBe('a-b-c.csv');
    });
});
