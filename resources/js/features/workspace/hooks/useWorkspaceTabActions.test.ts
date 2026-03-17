import {QueryTabDto} from "../../../types/queryTab";
import {describe, expect, it} from "vitest";
import {moveTabInsideGroup, withSequentialSortOrder} from "./useWorkspaceTabActions";

function makeTab(
    id: number,
    title: string,
    sortOrder: number,
    isPinned = false,
): QueryTabDto {
    return {
        id,
        user_id: 1,
        db_connection_id: null,
        title,
        sql_text: `select ${id};`,
        sort_order: sortOrder,
        is_pinned: isPinned,

        result_limit: 100,
        selected_text: null,
        cursor_position: null,
        selection_range: null,
        last_executed_at: null,
        connection: null,
        created_at: '',
        updated_at: '',
    };
}

describe('withSequentialSortOrder', () => {
    it('reassigns sort order sequentially from zero', () => {
        const tabs = [
            makeTab(10, 'A', 100),
            makeTab(11, 'B', 400),
            makeTab(12, 'C', 900),
        ];

        const result = withSequentialSortOrder(tabs);

        expect(result.map((tab) => ({id: tab.id, sort_order: tab.sort_order}))).toEqual([
            {id: 10, sort_order: 0},
            {id: 11, sort_order: 1},
            {id: 12, sort_order: 2},
        ]);
    });

    it('does not change relative order of items', () => {
        const tabs = [
            makeTab(3, 'Third', 30),
            makeTab(1, 'First', 10),
            makeTab(2, 'Second', 20),
        ];

        const result = withSequentialSortOrder(tabs);

        expect(result.map((tab) => tab.id)).toEqual([3, 1, 2]);
    });
});

describe('moveTabInsideGroup', () => {
    it('moves an unpinned tab left inside the unpinned group only', () => {
        const tabs = [
            makeTab(1, 'Pinned A', 0, true),
            makeTab(2, 'Pinned B', 1, true),
            makeTab(3, 'Tab A', 2, false),
            makeTab(4, 'Tab B', 3, false),
            makeTab(5, 'Tab C', 4, false),
        ];

        const result = moveTabInsideGroup(tabs, 5, 'left');

        expect(result.map((tab) => ({id: tab.id, sort_order: tab.sort_order}))).toEqual([
            {id: 1, sort_order: 0},
            {id: 2, sort_order: 1},
            {id: 3, sort_order: 2},
            {id: 5, sort_order: 3},
            {id: 4, sort_order: 4},
        ]);
    });

    it('moves a pinned tab right only inside the pinned group', () => {
        const tabs = [
            makeTab(1, 'Pinned A', 0, true),
            makeTab(2, 'Pinned B', 1, true),
            makeTab(3, 'Pinned C', 2, true),
            makeTab(4, 'Tab A', 3, false),
            makeTab(5, 'Tab B', 4, false),
        ];

        const result = moveTabInsideGroup(tabs, 1, 'right');

        expect(result.map((tab) => ({id: tab.id, sort_order: tab.sort_order}))).toEqual([
            {id: 2, sort_order: 0},
            {id: 1, sort_order: 1},
            {id: 3, sort_order: 2},
            {id: 4, sort_order: 3},
            {id: 5, sort_order: 4},
        ]);
    });

    it('returns original array when moving first tab left out of bounds', () => {
        const tabs = [
            makeTab(1, 'Pinned A', 0, true),
            makeTab(2, 'Pinned B', 1, true),
            makeTab(3, 'Tab A', 2, false),
        ];

        const result = moveTabInsideGroup(tabs, 1, 'left');

        expect(result).toBe(tabs);
    });

    it('returns original array when moving last tab right out of bounds', () => {
        const tabs = [
            makeTab(1, 'Pinned A', 0, true),
            makeTab(2, 'Tab A', 1, false),
            makeTab(3, 'Tab B', 2, false),
        ];

        const result = moveTabInsideGroup(tabs, 3, 'right');

        expect(result).toBe(tabs);
    });

    it('returns original array when target tab does not exist', () => {
        const tabs = [
            makeTab(1, 'Pinned A', 0, true),
            makeTab(2, 'Tab A', 1, false),
        ];

        const result = moveTabInsideGroup(tabs, 999, 'left');

        expect(result).toBe(tabs);
    });

    it('preserves pinned and unpinned group boundaries', () => {
        const tabs = [
            makeTab(1, 'Pinned A', 0, true),
            makeTab(2, 'Pinned B', 1, true),
            makeTab(3, 'Tab A', 2, false),
            makeTab(4, 'Tab B', 3, false),
        ];

        const result = moveTabInsideGroup(tabs, 3, 'left');

        expect(result.map((tab) => tab.id)).toEqual([1, 2, 3, 4]);
        expect(result).toBe(tabs);
    });
});
