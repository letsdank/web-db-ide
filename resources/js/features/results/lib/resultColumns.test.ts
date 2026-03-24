import {describe, expect, it} from "vitest";
import {buildVisibleResultColumns} from "./resultColumns";

describe('buildVisibleResultColumns', () => {
    const columns = [
        {name: 'id', native_type: 'int8'},
        {name: 'name', native_type: 'varchar'},
        {name: 'email', native_type: 'varchar'},
        {name: 'created_at', native_type: 'timestamp'},
    ];

    it('keeps original order when nothing is hidden or pinned', () => {
        const result = buildVisibleResultColumns(columns, [], []);

        expect(result.map((column) => column.name)).toEqual([
            'id',
            'name',
            'email',
            'created_at',
        ]);
    });

    it('moves pinned columns to the left', () => {
        const result = buildVisibleResultColumns(columns, [], ['email']);

        expect(result.map((column) => column.name)).toEqual([
            'email',
            'id',
            'name',
            'created_at',
        ]);

        expect(result[0]?.isPinned).toBe(true);
    });

    it('preserved original order inside pinned and unpinned groups', () => {
        const result = buildVisibleResultColumns(columns, [], ['created_at', 'name']);

        expect(result.map((column) => column.name)).toEqual([
            'name',
            'created_at',
            'id',
            'email',
        ]);
    });

    it('excludes hidden columns even if they were pinned', () => {
        const result = buildVisibleResultColumns(columns, ['email'], ['email', 'name']);

        expect(result.map((column) => column.name)).toEqual([
            'name',
            'id',
            'created_at',
        ]);
    });
});
