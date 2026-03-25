import type {QueryTabDto} from "../../../types/queryTab";
import type {SavedQueryDto} from "../../../types/savedQuery";
import {useCallback} from "react";
import {createSavedQuery, updateSavedQuery} from "../../../api/savedQueries";
import type {QueryHistoryDto} from "../../../types/queryHistory";
import {useI18n} from "../../../i18n";
import type {SaveQueryDialogSubmitPayload} from "../../../components/workspace/SaveQueryDialog";

/**
 * Store actions and active-tab context required for saved-query and history flows.
 */
interface Params {
    activeTab: QueryTabDto | null;
    activeConnectionId: number | null;

    addSavedQuery: (query: SavedQueryDto) => void;
    updateSavedQueryInList: (query: SavedQueryDto) => void;
    setRightPanel: (panel: 'history' | 'saved') => void;

    handleCreateTab: (initial?: {
        title?: string;
        sql_text?: string;
        db_connection?: number | null;
    }) => Promise<void> | void;
}

/**
 * Encapsulates workspace "library" actions: saved queries and query history.
 *
 * The hook owns:
 * - saving the current editor query into the library
 * - updating existing saved-query metadata
 * - opening history entries in fresh tabs
 * - opening saved queries in fresh tabs
 */
export function useWorkspaceLibrary({
                                        activeTab,
                                        activeConnectionId,
                                        addSavedQuery,
                                        updateSavedQueryInList,
                                        setRightPanel,
                                        handleCreateTab,
                                    }: Params) {
    const {t} = useI18n();

    /**
     * Saves the current active tab SQL as a new saved query.
     *
     * After a successful save, the right sidebar is switched to the saved-query
     * panel so the user immediately sees the newly created item.
     */
    const handleSaveCurrentQuery = useCallback(async (payload: SaveQueryDialogSubmitPayload) => {
        if (!activeTab) {
            return;
        }

        const saved = await createSavedQuery({
            db_connection_id: activeConnectionId,
            title: payload.title,
            sql_text: activeTab.sql_text,
            folder: payload.folder,
            visibility: payload.visibility,
        });

        addSavedQuery(saved);
        setRightPanel('saved');

        return saved;
    }, [activeConnectionId, activeTab, addSavedQuery, setRightPanel]);

    /**
     * Updates saved-query metadata such as title, folder and visibility.
     */
    const handleUpdateSavedQuery = useCallback(async (
        savedQuery: SavedQueryDto,
        payload: SaveQueryDialogSubmitPayload,
    ) => {
        const updated = await updateSavedQuery(savedQuery.id, {
            title: payload.title,
            folder: payload.folder,
            visibility: payload.visibility,
        });

        updateSavedQueryInList(updated);
        setRightPanel('saved');

        return updated;
    }, [setRightPanel, updateSavedQueryInList]);

    /**
     * Opens a history item in a fresh tab so the original history entry remains
     * immutable and the user can freely edit or rerun the SQL.
     */
    const handleOpenHistoryItem = useCallback(async (item: QueryHistoryDto) => {
        await handleCreateTab({
            title: t('workspace.historyQuery'),
            sql_text: item.sql_text,
            db_connection: item.db_connection_id,
        });
    }, [handleCreateTab, t]);

    /**
     * Opens a saved query in a fresh tab, preserving the library item as the
     * source of truth and treating the editor tab as a working copy.
     */
    const handleOpenSavedQuery = useCallback(async (item: SavedQueryDto) => {
        await handleCreateTab({
            title: item.title,
            sql_text: item.sql_text,
            db_connection: item.db_connection_id,
        });
    }, [handleCreateTab]);

    return {
        handleSaveCurrentQuery,
        handleUpdateSavedQuery,
        handleOpenHistoryItem,
        handleOpenSavedQuery,
    };
}
