import {useWorkspaceStore} from "../stores/workspaceStore";
import {useCallback, useEffect, useMemo} from "react";
import {createConnection, CreateConnectionPayload, fetchConnections} from "../api/connections";
import {createQueryTab, deleteQueryTab, fetchQueryTabs, updateQueryTab} from "../api/queryTabs";
import {fetchQueryHistory} from "../api/queryHistory";
import {createSavedQuery, fetchSavedQueries} from "../api/savedQueries";
import {executeQuery} from "../api/queries";
import {QueryHistoryDto} from "../types/queryHistory";
import {SavedQueryDto} from "../types/savedQuery";
import {ConnectionFormDialog} from "../components/workspace/ConnectionFormDialog";
import {ConnectionsSidebar} from "../components/workspace/ConnectionsSidebar";
import {QueryTabsBar} from "../components/workspace/QueryTabsBar";
import {EditorToolbar} from "../components/workspace/EditorToolbar";
import {SqlEditorPane} from "../components/workspace/SqlEditorPane";
import {ResultsPanel} from "../components/workspace/ResultsPanel";
import {RightSidebarPanels} from "../components/workspace/RightSidebarPanels";
import {useDebouncedCallback} from "../hooks/useDebouncedCallback";
import {QueryTabDto} from "../types/queryTab";

export function WorkspacePage() {
    const {
        isBooting,
        setBooting,

        connections,
        setConnections,
        addConnection,

        tabs,
        setTabs,
        replaceTabs,
        addTab,
        upsertTab,
        removeTab,

        activeTabId,
        setActiveTabId,
        activeConnectionId,
        setActiveConnectionId,

        queryHistory,
        setQueryHistory,
        savedQueries,
        setSavedQueries,
        addSavedQuery,

        rightPanel,
        setRightPanel,

        tabStateById,
        setTabExecuting,
        setTabResult,
        ensureTabState,

        dirtyTabIds,
        markTabDirty,
        clearTabDirty,

        isConnectionDialogOpen,
        openConnectionDialog,
        closeConnectionDialog,
        isCreatingConnection,
        setIsCreatingConnection,
        connectionDialogError,
        setConnectionDialogError,
    } = useWorkspaceStore();

    const activeTab = useMemo(
        () => tabs.find((tab) => tab.id === activeTabId) ?? null,
        [tabs, activeTabId],
    );

    const activeTabState = activeTabId ? tabStateById[activeTabId] ?? null : null;
    const activeResult = activeTabState?.result ?? null;
    const isExecuting = activeTabState?.isExecuting ?? false;

    const hasSelection = Boolean(activeTab?.selected_text?.trim());

    const persistTabDraft = useDebouncedCallback(
        async (tabId: number, payload: Partial<QueryTabDto>) => {
            try {
                const updatedTab = await updateQueryTab(tabId, payload);
                upsertTab(updatedTab);
                clearTabDirty(tabId);
            } catch (error) {
                console.error(error);
            }
        },
        500,
    );

    const scheduleTabDraftPersist = useCallback((tab: QueryTabDto, payload: Partial<QueryTabDto>) => {
        persistTabDraft(tab.id, payload);
    }, [persistTabDraft]);

    useEffect(() => {
        async function boot() {
            try {
                const [connectionsData, tabsData, historyData, savedQueriesData] = await Promise.all([
                    fetchConnections(),
                    fetchQueryTabs(),
                    fetchQueryHistory(),
                    fetchSavedQueries(),
                ]);

                setConnections(connectionsData);
                setTabs(tabsData);
                setQueryHistory(historyData);
                setSavedQueries(savedQueriesData);

                const initialTab = tabsData[0] ?? null;
                const initialConnectionId =
                    initialTab?.db_connection_id ??
                    connectionsData[0]?.id ??
                    null;

                setActiveTabId(initialTab?.id ?? null);
                setActiveConnectionId(initialConnectionId);

                if (initialTab?.id) {
                    ensureTabState(initialTab.id);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setBooting(false);
            }
        }

        void boot();
    }, [
        ensureTabState,
        setActiveConnectionId,
        setActiveTabId,
        setBooting,
        setConnections,
        setQueryHistory,
        setSavedQueries,
        setTabs,
    ]);

    async function handleCreateTab(initial?: Partial<{
        title: string;
        sql_text: string;
        db_connection_id: number | null;
    }>) {
        try {
            const tab = await createQueryTab({
                db_connection_id: initial?.db_connection_id ?? activeConnectionId,
                title: initial?.title ?? 'New Query',
                sql_text: initial?.sql_text ?? '',
            });

            addTab(tab);

            if (tab.db_connection_id) {
                setActiveConnectionId(tab.db_connection_id);
            }
        } catch (error) {
            console.error(error);
        }
    }

    async function handleSelectTab(id: number) {
        setActiveTabId(id);

        const tab = tabs.find((item) => item.id === id);

        if (tab?.db_connection_id !== undefined) {
            setActiveConnectionId(tab.db_connection_id);
        }

        ensureTabState(id);
    }

    async function handleChangeSql(value: string) {
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
    }

    function handleEditorSelectionChange(payload: {
        selectedText: string | null,
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
    }) {
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
    }

    async function handleSelectConnection(id: number | null) {
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
    }

    async function handleTogglePin(tab: QueryTabDto) {
        const nextTab: QueryTabDto = {
            ...tab,
            is_pinned: !tab.is_pinned,
        };

        upsertTab(nextTab);

        try {
            const updatedTab = await updateQueryTab(tab.id, {
                is_pinned: nextTab.is_pinned,
            });

            upsertTab(updatedTab);
        } catch (error) {
            console.error(error);
            upsertTab(tab);
        }
    }

    async function handleCloseTab(tabId: number) {
        const tab = tabs.find((item) => item.id === tabId);

        if (!tab || tab.is_pinned) {
            return;
        }

        const previousTabs = tabs;

        removeTab(tabId);

        try {
            await deleteQueryTab(tabId);

            const remainingTabs = previousTabs.filter((item) => item.id !== tabId);

            if (remainingTabs.length === 0) {
                await handleCreateTab({
                    title: 'New Query',
                    sql_text: '',
                    db_connection_id: activeConnectionId,
                });
            }
        } catch (error) {
            console.error(error);
            replaceTabs(previousTabs);
        }
    }

    async function handleRun(target: 'auto' | 'selection' | 'full' = 'auto') {
        if (!activeTab || !activeConnectionId) {
            return;
        }

        const selectedSql = activeTab.selected_text?.trim() || null;
        const sqlToExecute =
            target === 'selection'
                ? selectedSql
                : target === 'full'
                    ? null
                    : selectedSql;

        setTabExecuting(activeTab.id, true);

        try {
            const response = await executeQuery({
                connection_id: activeConnectionId,
                query_tab_id: activeTab.id,
                sql: activeTab.sql_text,
                selected_sql: sqlToExecute,
                max_rows: 500,
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
                    error: responseData?.message || error?.message || 'Failed to execute query.',
                });
            }
        } finally {
            setTabExecuting(activeTab.id, false);
        }
    }

    async function handleRunSelection() {
        await handleRun('selection');
    }

    async function handleCreateConnection(payload: CreateConnectionPayload) {
        setIsCreatingConnection(true);
        setConnectionDialogError(null);

        try {
            const created = await createConnection(payload);

            addConnection(created);
            setActiveConnectionId(created.id);
            closeConnectionDialog();

            if (activeTab) {
                const updatedTab = await updateQueryTab(activeTab.id, {
                    db_connection_id: created.id,
                });

                upsertTab(updatedTab);
            }
        } catch (error: any) {
            console.error(error);

            setConnectionDialogError(
                error?.response?.data?.message ||
                error?.message ||
                'Failed to create connection.',
            );
        } finally {
            setIsCreatingConnection(false);
        }
    }

    async function handleSaveCurrentQuery() {
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
    }

    async function handleOpenHistoryItem(item: QueryHistoryDto) {
        await handleCreateTab({
            title: 'History Query',
            sql_text: item.sql_text,
            db_connection_id: item.db_connection_id,
        });
    }

    async function handleOpenSavedQuery(item: SavedQueryDto) {
        await handleCreateTab({
            title: item.title,
            sql_text: item.sql_text,
            db_connection_id: item.db_connection_id,
        });
    }

    if (isBooting) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--g-color-base-background)',
                }}
            >
                Loading...
            </div>
        );
    }

    return (
        <>
            <ConnectionFormDialog
                open={isConnectionDialogOpen}
                loading={isCreatingConnection}
                error={connectionDialogError}
                onClose={closeConnectionDialog}
                onSubmit={handleCreateConnection}
            />

            <div
                style={{
                    minHeight: '100vh',
                    padding: 16,
                    background: 'var(--g-color-base-background)',
                    boxSizing: 'border-box',
                }}
            >
                <div
                    style={{
                        height: 'calc(100vh - 32px)',
                        display: 'grid',
                        gridTemplateColumns: '280px minmax(0, 1fr) 320px',
                        gap: 16,
                    }}
                >
                    <ConnectionsSidebar
                        connections={connections}
                        activeConnectionId={activeConnectionId}
                        onSelect={handleSelectConnection}
                        onCreateClick={openConnectionDialog}
                        onOpenSql={handleCreateTab}
                    />

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateRows: '72px 72px minmax(0, 1fr) 320px',
                            gap: 16,
                            minHeight: 0,
                        }}
                    >
                        <QueryTabsBar
                            tabs={tabs}
                            activeTabId={activeTabId}
                            dirtyTabIds={dirtyTabIds}
                            onSelect={handleSelectTab}
                            onCreate={() => handleCreateTab()}
                            onClose={handleCloseTab}
                            onTogglePin={handleTogglePin}
                        />

                        <EditorToolbar
                            connections={connections}
                            activeConnectionId={activeConnectionId}
                            isExecuting={isExecuting}
                            hasSelection={hasSelection}
                            onSelectConnection={handleSelectConnection}
                            onRun={() => handleRun('auto')}
                            onRunSelection={handleRunSelection}
                        />

                        <div style={{minHeight: 0}}>
                            <SqlEditorPane
                                value={activeTab?.sql_text ?? ''}
                                onChange={handleChangeSql}
                                onSelectionChange={handleEditorSelectionChange}
                                onRun={() => handleRun('auto')}
                            />
                        </div>

                        <div style={{minHeight: 0}}>
                            <ResultsPanel result={activeResult}/>
                        </div>
                    </div>

                    <RightSidebarPanels
                        panel={rightPanel}
                        history={queryHistory}
                        savedQueries={savedQueries}
                        onChangePanel={setRightPanel}
                        onOpenHistoryItem={handleOpenHistoryItem}
                        onOpenSavedQuery={handleOpenSavedQuery}
                        onSaveCurrentQuery={handleSaveCurrentQuery}
                    />
                </div>
            </div>
        </>
    );
}
