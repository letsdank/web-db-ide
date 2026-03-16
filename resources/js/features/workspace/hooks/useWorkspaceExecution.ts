import {QueryTabDto} from "../../../types/queryTab";
import {useCallback} from "react";
import {executeQuery} from "../../../api/queries";
import {updateQueryTab} from "../../../api/queryTabs";
import {fetchQueryHistory} from "../../../api/queryHistory";
import {useI18n} from "../../../i18n";


const DESTRUCTIVE_SQL_KEYWORDS = [
    'drop',
    'truncate',
    'alter',
    'delete',
    'update',
    'insert',
    'create',
    'grant',
    'revoke',
] as const;

function stripSqlComments(sql: string): string {
    return sql
        // block comments
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        // line comments
        .replace(/--.*$/gm, ' ')
        .trim();
}

function isPotentiallyDestructiveSql(sql: string): boolean {
    const normalized = stripSqlComments(sql).toLowerCase();

    if (!normalized) {
        return false;
    }

    return DESTRUCTIVE_SQL_KEYWORDS.some((keyword) =>
        new RegExp(`\\b${keyword}\\b`, 'i').test(normalized),
    );
}

function truncateSqlPreview(sql: string, maxLength = 220): string {
    const compact = sql.replace(/\s+/g, ' ').trim();

    if (compact.length <= maxLength) {
        return compact;
    }

    return `${compact.slice(0, maxLength)}...`;
}

interface Params {
    activeTab: QueryTabDto | null;
    activeConnectionId: number | null;

    setTabExecuting: (tabId: number, value: boolean) => void;
    setTabResult: (tabId: number, result: any) => void;
    upsertTab: (tab: QueryTabDto) => void;
    clearTabDirty: (tabId: number) => void;
    setQueryHistory: (items: any[]) => void;
    setRightPanel: (panel: 'history' | 'saved') => void;
}

export function useWorkspaceExecution({
                                          activeTab,
                                          activeConnectionId,
                                          setTabExecuting,
                                          setTabResult,
                                          upsertTab,
                                          clearTabDirty,
                                          setQueryHistory,
                                          setRightPanel,
                                      }: Params) {
    const {t} = useI18n();

    const confirmDestructiveQuery = useCallback((sql: string): boolean => {
        if (!isPotentiallyDestructiveSql(sql)) {
            return true;
        }

        const preview = truncateSqlPreview(sql);

        return window.confirm(
            [
                t('workspace.destructiveSqlDetected'),
                t('workspace.confirmExecution'),
                '',
                preview ? t('workspace.sqlPreview', {preview}) : '',
            ].join('\n'),
        );
    }, [t]);

    const handleRun = useCallback(async (target: 'auto' | 'selection' | 'full' = 'auto') => {
        if (!activeTab || !activeConnectionId) {
            return;
        }

        const selectedSql = activeTab.selected_text?.trim() || null;

        if (target === 'selection' && !selectedSql) {
            return;
        }

        const sqlToExecute =
            target === 'selection'
                ? selectedSql
                : null;

        const effectiveSql = (sqlToExecute ?? activeTab.sql_text ?? '').trim();

        if (!effectiveSql) {
            return;
        }

        if (!confirmDestructiveQuery(effectiveSql)) {
            return;
        }

        setTabExecuting(activeTab.id, true);

        try {
            const response = await executeQuery({
                connection_id: activeConnectionId,
                query_tab_id: activeTab.id,
                sql: activeTab.sql_text,
                selected_sql: sqlToExecute,
                max_rows: activeTab.result_limit ?? 500,
                save_to_history: true,
            });

            setTabResult(activeTab.id, response);

            const [updatedTab, historyData] = await Promise.all([
                updateQueryTab(activeTab.id, {
                    last_executed_at: new Date().toISOString(),
                    db_connection_id: activeConnectionId,
                    selected_text: activeTab.selected_text,
                    cursor_position: activeTab.cursor_position,
                    selection_range: activeTab.selection_range,
                }),
                fetchQueryHistory(),
            ]);

            upsertTab(updatedTab);
            clearTabDirty(activeTab.id);
            setQueryHistory(historyData);
            setRightPanel('history');
        } catch (error: any) {
            console.error(error);

            const responseData = error?.response?.data;

            if (responseData?.status === 'error') {
                setTabResult(activeTab.id, responseData);
            } else {
                setTabResult(activeTab.id, {
                    execution_id: crypto.randomUUID(),
                    status: 'error',
                    error: responseData?.message || error?.message || t('workspace.failedToExecuteQuery'),
                });
            }
        } finally {
            setTabExecuting(activeTab.id, false);
        }
    }, [
        activeConnectionId,
        activeTab,
        clearTabDirty,
        confirmDestructiveQuery,
        setQueryHistory,
        setRightPanel,
        setTabExecuting,
        setTabResult,
        upsertTab,
        t,
    ]);

    const handleRunSelection = useCallback(async () => {
        if (!activeTab?.selected_text?.trim()) {
            return;
        }

        await handleRun('selection');
    }, [activeTab?.selected_text, handleRun]);

    const handleChangeResultLimit = useCallback(async (limit: 100 | 500 | 1000) => {
        if (!activeTab) {
            return;
        }

        const updatedTab = await updateQueryTab(activeTab.id, {
            result_limit: limit,
        });

        upsertTab(updatedTab);
    }, [activeTab, upsertTab]);

    const handleChangeResultLimitAndRerun = useCallback(async (limit: 100 | 500 | 1000) => {
        if (!activeTab) {
            return;
        }

        await handleChangeResultLimit(limit);

        if (!activeConnectionId) {
            return;
        }

        const effectiveSql = (activeTab.selected_text?.trim() || activeTab.sql_text || '').trim();

        if (!effectiveSql) {
            return;
        }

        if (!confirmDestructiveQuery(effectiveSql)) {
            return;
        }

        setTabExecuting(activeTab.id, true);

        try {
            const response = await executeQuery({
                connection_id: activeConnectionId,
                query_tab_id: activeTab.id,
                sql: activeTab.sql_text,
                selected_sql: activeTab.selected_text?.trim() || null,
                max_rows: limit,
                save_to_history: true,
            });

            setTabResult(activeTab.id, response);

            const [updatedTab, historyData] = await Promise.all([
                updateQueryTab(activeTab.id, {
                    last_executed_at: new Date().toISOString(),
                    db_connection_id: activeConnectionId,
                    selected_text: activeTab.selected_text,
                    cursor_position: activeTab.cursor_position,
                    selection_range: activeTab.selection_range,
                    result_limit: limit,
                }),
                fetchQueryHistory(),
            ]);

            upsertTab(updatedTab);
            clearTabDirty(activeTab.id);
            setQueryHistory(historyData);
            setRightPanel('history');
        } catch (error: any) {
            console.error(error);

            const responseData = error?.response?.data;

            if (responseData?.status === 'error') {
                setTabResult(activeTab.id, responseData);
            } else {
                setTabResult(activeTab.id, {
                    execution_id: crypto.randomUUID(),
                    status: 'error',
                    error: responseData?.message || error?.message || t('workspace.failedToExecuteQuery'),
                });
            }
        } finally {
            setTabExecuting(activeTab.id, false);
        }
    }, [
        activeConnectionId,
        activeTab,
        clearTabDirty,
        confirmDestructiveQuery,
        handleChangeResultLimit,
        setQueryHistory,
        setRightPanel,
        setTabExecuting,
        setTabResult,
        upsertTab,
        t,
    ]);

    return {
        handleRun,
        handleRunSelection,
        handleChangeResultLimit,
        handleChangeResultLimitAndRerun,
    };
}

