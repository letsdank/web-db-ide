import {QueryTabDto} from "../../../types/queryTab";
import {beforeEach, describe, expect, it, vi} from "vitest";
import * as queryTabsApi from '../../../api/queryTabs';
import {useWorkspaceDraft} from "./useWorkspaceDraft";
import React from "react";
import {render} from "@testing-library/react";

const debouncedCalls: Array<{
    tabId: number;
    payload: Partial<QueryTabDto>;
}> = [];

vi.mock('../../../api/queryTabs', async () => {
    return {
        updateQueryTab: vi.fn(),
    };
});

vi.mock('../../../hooks/useDebouncedCallback', async () => {
    return {
        useDebouncedCallback: (callback: (...args: any[]) => any) => {
            return (...args: any[]) => {
                debouncedCalls.push({
                    tabId: args[0],
                    payload: args[1],
                });

                return callback(...args);
            };
        },
    };
});

function makeTab(overrides: Partial<QueryTabDto> = {}): QueryTabDto {
    return {
        id: 7,
        user_id: 1,
        db_connection_id: 12,
        title: 'Users query',
        sql_text: 'select * from users;',
        sort_order: 0,
        is_pinned: false,
        result_limit: 100,
        selected_text: null,
        cursor_position: null,
        selection_range: null,
        last_executed_at: null,
        created_at: '',
        updated_at: '',
        connection: null,
        ...overrides,
    };
}

describe('useWorkspaceDraft', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        debouncedCalls.length = 0;
    });

    it('updates sql optimistically, marks tab dirty and schedules persist', async () => {
        const upsertTab = vi.fn();
        const markTabDirty = vi.fn();
        const clearTabDirty = vi.fn();
        const setActiveConnectionId = vi.fn();

        vi.mocked(queryTabsApi.updateQueryTab).mockResolvedValue(
            makeTab({sql_text: 'select id from users;'}),
        );

        let hookApi!: ReturnType<typeof useWorkspaceDraft>;

        function TestHarness() {
            const api = useWorkspaceDraft({
                activeTab: makeTab(),
                activeConnectionId: 12,
                upsertTab,
                markTabDirty,
                clearTabDirty,
                setActiveConnectionId,
            });

            React.useEffect(() => {
                hookApi = api;
            }, [api]);

            return <div>ready</div>;
        }

        render(<TestHarness/>);

        await hookApi.handleChangeSql('select id from users;');

        expect(upsertTab).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 7,
                sql_text: 'select id from users;',
            }),
        );

        expect(markTabDirty).toHaveBeenCalledWith(7);

        expect(debouncedCalls).toHaveLength(1);
        expect(debouncedCalls[0]).toEqual({
            tabId: 7,
            payload: {
                sql_text: 'select id from users;',
                db_connection_id: 12,
                selected_text: null,
                cursor_position: null,
                selection_range: null,
            },
        });

        expect(queryTabsApi.updateQueryTab).toHaveBeenCalledWith(7, {
            sql_text: 'select id from users;',
            db_connection_id: 12,
            selected_text: null,
            cursor_position: null,
            selection_range: null,
        });

        expect(clearTabDirty).toHaveBeenCalledWith(7);
    });

    it('updates editor selection optimistically and schedules persist with selection payload', async () => {
        const upsertTab = vi.fn();
        const markTabDirty = vi.fn();
        const clearTabDirty = vi.fn();
        const setActiveConnectionId = vi.fn();

        vi.mocked(queryTabsApi.updateQueryTab).mockResolvedValue(
            makeTab({
                selected_text: 'from users',
                cursor_position: {lineNumber: 1, column: 12},
                selection_range: {
                    startLineNumber: 1,
                    startColumn: 8,
                    endLineNumber: 1,
                    endColumn: 18,
                },
            }),
        );

        let hookApi!: ReturnType<typeof useWorkspaceDraft>;

        function TestHarness() {
            const api = useWorkspaceDraft({
                activeTab: makeTab(),
                activeConnectionId: 12,
                upsertTab,
                markTabDirty,
                clearTabDirty,
                setActiveConnectionId,
            });

            React.useEffect(() => {
                hookApi = api;
            }, [api]);

            return <div>ready</div>;
        }

        render(<TestHarness/>);

        hookApi.handleEditorSelectionChange({
            selectedText: 'from users',
            cursorPosition: {lineNumber: 1, column: 12},
            selectionRange: {
                startLineNumber: 1,
                startColumn: 8,
                endLineNumber: 1,
                endColumn: 18,
            },
        });

        expect(upsertTab).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 7,
                selected_text: 'from users',
                cursor_position: {lineNumber: 1, column: 12},
                selection_range: {
                    startLineNumber: 1,
                    startColumn: 8,
                    endLineNumber: 1,
                    endColumn: 18,
                },
            }),
        );

        expect(markTabDirty).toHaveBeenCalledWith(7);

        expect(debouncedCalls).toHaveLength(1);
        expect(debouncedCalls[0]).toEqual({
            tabId: 7,
            payload: {
                sql_text: 'select * from users;',
                db_connection_id: 12,
                selected_text: 'from users',
                cursor_position: {lineNumber: 1, column: 12},
                selection_range: {
                    startLineNumber: 1,
                    startColumn: 8,
                    endLineNumber: 1,
                    endColumn: 18,
                },
            },
        });
    });

    it('updates connection immediately and persists current editor state', async () => {
        const upsertTab = vi.fn();
        const markTabDirty = vi.fn();
        const clearTabDirty = vi.fn();
        const setActiveConnectionId = vi.fn();

        vi.mocked(queryTabsApi.updateQueryTab).mockResolvedValue(
            makeTab({
                db_connection_id: 33,
                selected_text: 'users',
                cursor_position: {lineNumber: 1, column: 7},
                selection_range: {
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 6,
                },
            }),
        );

        let hookApi!: ReturnType<typeof useWorkspaceDraft>;

        function TestHarness() {
            const api = useWorkspaceDraft({
                activeTab: makeTab({
                    selected_text: 'users',
                    cursor_position: {lineNumber: 1, column: 7},
                    selection_range: {
                        startLineNumber: 1,
                        startColumn: 1,
                        endLineNumber: 1,
                        endColumn: 6,
                    },
                }),
                activeConnectionId: 12,
                upsertTab,
                markTabDirty,
                clearTabDirty,
                setActiveConnectionId,
            });

            React.useEffect(() => {
                hookApi = api;
            }, [api]);

            return <div>ready</div>;
        }

        render(<TestHarness/>);

        await hookApi.handleSelectConnection(33);

        expect(setActiveConnectionId).toHaveBeenCalledWith(33);

        expect(upsertTab).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                id: 7,
                db_connection_id: 33,
            }),
        );

        expect(queryTabsApi.updateQueryTab).toHaveBeenCalledWith(7, {
            db_connection_id: 33,
            sql_text: 'select * from users;',
            selected_text: 'users',
            cursor_position: {lineNumber: 1, column: 7},
            selection_range: {
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: 1,
                endColumn: 6,
            },
        });

        expect(upsertTab).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                db_connection_id: 33,
            }),
        );
    });

    it('does nothing when there is no active tab', async () => {
        const upsertTab = vi.fn();
        const markTabDirty = vi.fn();
        const clearTabDirty = vi.fn();
        const setActiveConnectionId = vi.fn();

        let hookApi!: ReturnType<typeof useWorkspaceDraft>;

        function TestHarness() {
            const api = useWorkspaceDraft({
                activeTab: null,
                activeConnectionId: null,
                upsertTab,
                markTabDirty,
                clearTabDirty,
                setActiveConnectionId,
            });

            React.useEffect(() => {
                hookApi = api;
            }, [api]);

            return <div>ready</div>;
        }

        render(<TestHarness/>);

        await hookApi.handleChangeSql('select 1;');
        hookApi.handleEditorSelectionChange({
            selectedText: '1',
            cursorPosition: {lineNumber: 1, column: 8},
            selectionRange: {
                startLineNumber: 1,
                startColumn: 8,
                endLineNumber: 1,
                endColumn: 9,
            },
        });
        await hookApi.handleSelectConnection(55);

        expect(upsertTab).not.toHaveBeenCalled();
        expect(markTabDirty).not.toHaveBeenCalled();
        expect(clearTabDirty).not.toHaveBeenCalled();
        expect(queryTabsApi.updateQueryTab).not.toHaveBeenCalled();
        expect(debouncedCalls).toHaveLength(0);
        expect(setActiveConnectionId).toHaveBeenCalledWith(55);
    });
});
