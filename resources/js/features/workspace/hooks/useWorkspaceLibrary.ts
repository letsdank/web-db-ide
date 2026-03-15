import {QueryTabDto} from "../../../types/queryTab";
import {SavedQueryDto} from "../../../types/savedQuery";
import {useCallback} from "react";
import {createSavedQuery} from "../../../api/savedQueries";
import {QueryHistoryDto} from "../../../types/queryHistory";

interface Params {
    activeTab: QueryTabDto | null;
    activeConnectionId: number | null;

    addSavedQuery: (query: SavedQueryDto) => void;
    setRightPanel: (panel: 'history' | 'saved') => void;

    handleCreateTab: (initial?: {
        title?: string;
        sql_text?: string;
        db_connection?: number | null;
    }) => Promise<void> | void;
}

export function useWorkspaceLibrary({
                                        activeTab,
                                        activeConnectionId,
                                        addSavedQuery,
                                        setRightPanel,
                                        handleCreateTab,
                                    }: Params) {
    const handleSaveCurrentQuery = useCallback(async () => {
        if (!activeTab) {
            return;
        }

        try {
            const saved = await createSavedQuery({
                db_connection_id: activeConnectionId,
                title: activeTab.title || 'New Query',
                sql_text: activeTab.sql_text,
                folder: 'General',
            });

            addSavedQuery(saved);
            setRightPanel('saved');
        } catch (error) {
            console.error(error);
        }
    }, [activeConnectionId, activeTab, addSavedQuery, setRightPanel]);

    const handleOpenHistoryItem = useCallback(async (item: QueryHistoryDto) => {
        await handleCreateTab({
            title: 'History Query',
            sql_text: item.sql_text,
            db_connection: item.db_connection_id,
        });
    }, [handleCreateTab]);

    const handleOpenSavedQuery = useCallback(async (item: SavedQueryDto) => {
        await handleCreateTab({
            title: item.title,
            sql_text: item.sql_text,
            db_connection: item.db_connection_id,
        });
    }, [handleCreateTab]);

    return {
        handleSaveCurrentQuery,
        handleOpenHistoryItem,
        handleOpenSavedQuery,
    };
}
