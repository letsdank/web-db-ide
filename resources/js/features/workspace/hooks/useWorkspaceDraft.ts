import type {QueryTabDto} from "../../../types/queryTab";
import {useDebouncedCallback} from "../../../hooks/useDebouncedCallback";
import {updateQueryTab} from "../../../api/queryTabs";
import {useCallback} from "react";

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

interface Params {
    activeTab: QueryTabDto | null;
    activeConnectionId: number | null;
    upsertTab: (tab: QueryTabDto) => void;
    markTabDirty: (tabId: number) => void;
    clearTabDirty: (tabId: number) => void;
    setActiveConnectionId: (id: number | null) => void;
}

export function useWorkspaceDraft({
                                      activeTab,
                                      activeConnectionId,
                                      upsertTab,
                                      markTabDirty,
                                      clearTabDirty,
                                      setActiveConnectionId,
                                  }: Params) {
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

    const scheduleTabDraftPersist = useCallback((tab: QueryTabDto, payload: Partial<QueryTabDto>) => {
        persistTabDraft(tab.id, payload);
    }, [persistTabDraft]);

    const handleChangeSql = useCallback(async (value: string) => {
        if (!activeTab) {
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

    const handleEditorSelectionChange = useCallback((payload: EditorSelectionPayload) => {
        if (!activeTab) {
            return;
        }

        const nextTab: QueryTabDto = {
            ...activeTab,
            selected_text: payload.selectedText,
            cursor_position: payload.cursorPosition,
            selection_range: payload.selectionRange,
        };

        upsertTab(nextTab);
        markTabDirty(nextTab.id);

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
        markTabDirty,
        scheduleTabDraftPersist,
        upsertTab,
    ]);

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
