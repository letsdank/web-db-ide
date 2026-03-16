import {QueryTabDto} from "../../../types/queryTab";
import {SavedQueryDto} from "../../../types/savedQuery";
import {useCallback} from "react";
import {createSavedQuery} from "../../../api/savedQueries";
import {QueryHistoryDto} from "../../../types/queryHistory";
import {useI18n} from "../../../i18n";

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
    const {t} = useI18n();

    const handleSaveCurrentQuery = useCallback(async () => {
        if (!activeTab) {
            return;
        }

        try {
            const saved = await createSavedQuery({
                db_connection_id: activeConnectionId,
                title: activeTab.title || t('workspace.newQuery'),
                sql_text: activeTab.sql_text,
                folder: t('workspace.generalFolder'),
                visibility: 'private',
            });

            addSavedQuery(saved);
            setRightPanel('saved');
        } catch (error) {
            console.error(error);
        }
    }, [activeConnectionId, activeTab, addSavedQuery, setRightPanel, t]);

    const handleOpenHistoryItem = useCallback(async (item: QueryHistoryDto) => {
        await handleCreateTab({
            title: t('workspace.historyQuery'),
            sql_text: item.sql_text,
            db_connection: item.db_connection_id,
        });
    }, [handleCreateTab, t]);

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
