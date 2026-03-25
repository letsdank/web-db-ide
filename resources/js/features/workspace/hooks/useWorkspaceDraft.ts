import type {QueryTabDto} from "../../../types/queryTab";
import {useDebouncedCallback} from "../../../hooks/useDebouncedCallback";
import {updateQueryTab} from "../../../api/queryTabs";
import {useCallback} from "react";

/**
 * Editor selection payload emitted by the SQL editor integration.
 *
 * This is the minimal shape required to persist editor selection state into the
 * active tab record.
 */
interface EditorSelectionPayload {
    selectedText: string | null;
    cursorPosition: {
        lineNumber: number;
        column: number;
    } | null;
    selectionRange: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
    } | null;
}

/**
 * Compares two cursor positions for semantic equality.
 */
function isSamePosition(
    left: { lineNumber: number, column: number } | null | undefined,
    right: { lineNumber: number, column: number } | null | undefined,
): boolean {
    if (left === right) {
        return true;
    }

    if (!left || !right) {
        return left === right;
    }

    return left.lineNumber === right.lineNumber && left.column === right.column;
}

/**
 * Compares two editor selection ranges for semantic equality.
 */
function isSameSelectionRange(
    left: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
    } | null | undefined,
    right: {
        startLineNumber: number;
        startColumn: number,
        endLineNumber: number;
        endColumn: number;
    } | null | undefined,
): boolean {
    if (left === right) {
        return true;
    }

    if (!left || !right) {
        return left === right;
    }

    return left.startLineNumber === right.startLineNumber
        && left.startColumn === right.startColumn
        && left.endLineNumber === right.endLineNumber
        && left.endColumn === right.endColumn;
}

/**
 * Store actions and current state required for draft persistence flows.
 */
interface Params {
    activeTab: QueryTabDto | null;
    activeConnectionId: number | null;
    upsertTab: (tab: QueryTabDto) => void;
    markTabDirty: (tabId: number) => void;
    clearTabDirty: (tabId: number) => void;
    setActiveConnectionId: (id: number | null) => void;
}

/**
 * Encapsulates local draft editing and debounced persistence for the active tab.
 *
 * Responsibilities:
 * - optimistic local updates while typing
 * - dirty-state tracking
 * - debounced tab persistence
 * - persistence of cursor/selection metadata
 * - immediate persistence when rebinding the active connection
 */
export function useWorkspaceDraft({
                                      activeTab,
                                      activeConnectionId,
                                      upsertTab,
                                      markTabDirty,
                                      clearTabDirty,
                                      setActiveConnectionId,
                                  }: Params) {
    /**
     * Debounced server persistence for tab draft updates.
     *
     * The local tab is updated optimistically first; the API write is deferred
     * so frequent typing does not spam the backend.
     */
    const persistTabDraft = useDebouncedCallback(
        (tabId: number, payload: Partial<QueryTabDto>) => {
            void (async () => {
                try {
                    const updatedTab = await updateQueryTab(tabId, payload);
                    upsertTab(updatedTab);
                    clearTabDirty(tabId);
                } catch (error) {
                    console.error(error);
                }
            })();
        },
        750,
    );

    /**
     * Schedules a debounced persistence write for a given tab draft payload.
     */
    const scheduleTabDraftPersist = useCallback((tab: QueryTabDto, payload: Partial<QueryTabDto>) => {
        persistTabDraft(tab.id, payload);
    }, [persistTabDraft]);

    /**
     * Handles SQL editor text changes for the active tab.
     *
     * The hook updates the tab optimistically, marks it dirty, then schedules a
     * debounced persistence call with the full editor context.
     */
    const handleChangeSql = useCallback(async (value: string) => {
        if (!activeTab || value === activeTab.sql_text) {
            return;
        }

        const nextTab: QueryTabDto = {
            ...activeTab,
            sql_text: value,
        };

        upsertTab(nextTab);
        markTabDirty(nextTab.id);

        scheduleTabDraftPersist(nextTab, {
            sql_text: value,
            db_connection_id: activeConnectionId,
            selected_text: nextTab.selected_text,
            cursor_position: nextTab.cursor_position,
            selection_range: nextTab.selection_range,
        });
    }, [
        activeConnectionId,
        activeTab,
        markTabDirty,
        scheduleTabDraftPersist,
        upsertTab,
    ]);

    /**
     * Persists selection/cursor changes emitted by the editor.
     *
     * Guard clauses prevent unnecessary store churn and redundant API writes
     * when the editor reports the same selection metadata repeatedly.
     */
    const handleEditorSelectionChange = useCallback((payload: EditorSelectionPayload) => {
        if (!activeTab) {
            return;
        }

        if (
            activeTab.selected_text === payload.selectedText
            && isSamePosition(
                activeTab.cursor_position as { lineNumber: number; column: number },
                payload.cursorPosition,
            )
            && isSameSelectionRange(
                activeTab.selection_range as {
                    startLineNumber: number;
                    startColumn: number;
                    endLineNumber: number;
                    endColumn: number;
                } | null | undefined,
                payload.selectionRange,
            )
        ) {
            return;
        }

        const nextTab: QueryTabDto = {
            ...activeTab,
            selected_text: payload.selectedText,
            cursor_position: payload.cursorPosition,
            selection_range: payload.selectionRange,
        };

        upsertTab(nextTab);

        scheduleTabDraftPersist(nextTab, {
            sql_text: nextTab.sql_text,
            db_connection_id: activeConnectionId,
            selected_text: payload.selectedText,
            cursor_position: payload.cursorPosition,
            selection_range: payload.selectionRange,
        });
    }, [
        activeConnectionId,
        activeTab,
        scheduleTabDraftPersist,
        upsertTab,
    ]);

    /**
     * Rebinds the active tab to a connection and persists that binding
     * immediately, because connection changes are discrete user actions rather
     * than high-frequency typing events.
     */
    const handleSelectConnection = useCallback(async (id: number | null) => {
        setActiveConnectionId(id);

        if (!activeTab) {
            return;
        }

        const nextTab: QueryTabDto = {
            ...activeTab,
            db_connection_id: id,
        };

        upsertTab(nextTab);

        try {
            const updatedTab = await updateQueryTab(activeTab.id, {
                db_connection_id: id,
                sql_text: nextTab.sql_text,
                selected_text: nextTab.selected_text,
                cursor_position: nextTab.cursor_position,
                selection_range: nextTab.selection_range,
            });

            upsertTab(updatedTab);
        } catch (error) {
            console.error(error);
        }
    }, [activeTab, setActiveConnectionId, upsertTab]);

    return {
        scheduleTabDraftPersist,
        handleChangeSql,
        handleEditorSelectionChange,
        handleSelectConnection,
    };
}
