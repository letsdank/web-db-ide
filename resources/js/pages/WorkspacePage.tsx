import {useWorkspaceStore} from "../stores/workspaceStore";
import {useCallback, useEffect, useMemo, useState} from "react";
import {createConnection, deleteConnection, fetchConnections, updateConnection} from "../api/connections";
import {createQueryTab, deleteQueryTab, fetchQueryTabs, updateQueryTab} from "../api/queryTabs";
import {fetchQueryHistory} from "../api/queryHistory";
import {createSavedQuery, fetchSavedQueries} from "../api/savedQueries";
import {executeQuery} from "../api/queries";
import {QueryHistoryDto} from "../types/queryHistory";
import {SavedQueryDto} from "../types/savedQuery";
import {ConnectionFormDialog} from "../components/workspace/ConnectionFormDialog";
import {QueryTabsBar} from "../components/workspace/QueryTabsBar";
import {EditorToolbar} from "../components/workspace/EditorToolbar";
import {SqlEditorPane} from "../components/workspace/SqlEditorPane";
import {ResultsPanel} from "../features/results/components/ResultsPanel";
import {RightSidebarPanels} from "../components/workspace/RightSidebarPanels";
import {useDebouncedCallback} from "../hooks/useDebouncedCallback";
import {QueryTabDto} from "../types/queryTab";
import {CommandPaletteItem} from "../types/commandPalette";
import {Icon} from "@gravity-ui/uikit";
import {CirclePlus, ClockArrowRotateLeft, Database, FileText, LayoutCells, Magnifier} from "@gravity-ui/icons";
import {CommandPalette} from "../features/command-palette/components/CommandPalette";
import {WorkspaceMainLayout} from "../features/workspace/components/WorkspaceMainLayout";
import {ExplorerSidebar} from "../features/explorer/components/ExplorerSidebar";
import {CreateConnectionPayload, UpdateConnectionPayload} from "../types/connection";

export function WorkspacePage() {
    const {
        isBooting,
        setBooting,

        connections,
        setConnections,
        addConnection,
        updateConnectionInList,
        removeConnection,

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
        editingConnection,
        openCreateConnectionDialog,
        openEditConnectionDialog,
        closeConnectionDialog,
        isCreatingConnection,
        setIsCreatingConnection,
        connectionDialogError,
        setConnectionDialogError,
    } = useWorkspaceStore();

    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

    const activeTab = useMemo(
        () => tabs.find((tab) => tab.id === activeTabId) ?? null,
        [tabs, activeTabId],
    );

    const activeConnection = useMemo(
        () => connections.find((connection) => connection.id === activeConnectionId),
        [connections, activeConnectionId],
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
        function handleGlobalKeyDown(event: KeyboardEvent) {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setIsCommandPaletteOpen(true);
            }
        }

        window.addEventListener('keydown', handleGlobalKeyDown);

        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, []);

    const commandPaletteItems = useMemo<CommandPaletteItem[]>(() => {
        const activeConnection = activeConnectionId
            ? connections.find((connection) => connection.id === activeConnectionId)
            : null;

        const actionItems: CommandPaletteItem[] = [
            {
                id: 'action:new-tab',
                title: 'New query tab',
                subtitle: 'Create an empty SQL tab',
                kind: 'action',
                icon: <Icon data={CirclePlus} size={18}/>,
                keywords: ['new tab create query sql'],
                onSelect: () => handleCreateTab(),
            },
            {
                id: 'action:new-connection',
                title: 'New connection',
                subtitle: 'Open connection creation dialog',
                kind: 'action',
                icon: <Icon data={Database} size={18}/>,
                keywords: ['connection database create add'],
                onSelect: () => openCreateConnectionDialog(),
            },
            {
                id: 'action:run-query',
                title: 'Run current query',
                subtitle: activeTab?.title ?? 'Active tab',
                kind: 'action',
                icon: <Icon data={Magnifier} size={18}/>,
                keywords: ['run execute query sql current active'],
                onSelect: () => handleRun('auto'),
            },
            {
                id: 'action:show-history',
                title: 'Open history panel',
                subtitle: 'Switch right sidebar to History',
                kind: 'action',
                icon: <Icon data={ClockArrowRotateLeft} size={18}/>,
                keywords: ['history sidebar panel'],
                onSelect: () => setRightPanel('history'),
            },
            {
                id: 'action:show-saved',
                title: 'Open saved queries panel',
                subtitle: 'Switch right sidebar to Saved',
                kind: 'action',
                icon: <Icon data={LayoutCells} size={18}/>,
                keywords: ['saved queries sidebar panel'],
                onSelect: () => setRightPanel('saved'),
            },
        ];

        if (activeTab) {
            actionItems.push(
                {
                    id: 'action:duplicate-active-tab',
                    title: 'Duplicate active tab',
                    subtitle: activeTab.title || 'Current tab',
                    kind: 'action',
                    icon: <Icon data={FileText} size={18}/>,
                    keywords: ['duplicate tab copy current'],
                    onSelect: () => handleDuplicateTab(activeTab),
                },
                {
                    id: 'action:toggle-pin-active-tab',
                    title: activeTab.is_pinned ? 'Unpin active tab' : 'Pin active tab',
                    subtitle: activeTab.title || 'Current tab',
                    kind: 'action',
                    icon: <Icon data={FileText} size={18}/>,
                    keywords: ['pin unpin tab current'],
                    onSelect: () => handleTogglePin(activeTab),
                },
            );

            if (!activeTab.is_pinned) {
                actionItems.push({
                    id: 'action:close-active-tab',
                    title: 'Close active tab',
                    subtitle: activeTab.title || 'Current tab',
                    kind: 'action',
                    icon: <Icon data={FileText} size={18}/>,
                    keywords: ['close tab current'],
                    onSelect: () => handleCloseTab(activeTab.id),
                });
            }
        }

        if (activeConnection) {
            actionItems.push({
                id: 'action:select-active-connection',
                title: 'Current connection',
                subtitle: `${activeConnection.name} · ${activeConnection.database_name}`,
                kind: 'action',
                icon: <Icon data={Database} size={18}/>,
                keywords: ['current connection active database'],
                onSelect: () => handleSelectConnection(activeConnection.id),
            });
        }

        const tabItems: CommandPaletteItem[] = tabs.map((tab) => ({
            id: `tab:${tab.id}`,
            title: tab.title || 'New Query',
            subtitle: tab.db_connection_id
                ? connections.find((connection) => connection.id === tab.db_connection_id)?.name ?? 'Tab'
                : 'Unbound tab',
            kind: 'tab',
            icon: <Icon data={FileText} size={18}/>,
            keywords: [
                'tab query editor',
                tab.sql_text ?? '',
                tab.is_pinned ? 'pinned' : '',
            ],
            onSelect: () => handleSelectTab(tab.id),
        }));

        const connectionItems: CommandPaletteItem[] = connections.map((connection) => ({
            id: `connection:${connection.id}`,
            title: connection.name,
            subtitle: `${connection.database_name} · ${connection.host}:${connection.port}`,
            kind: 'connection',
            icon: <Icon data={Database} size={18}/>,
            keywords: [
                connection.driver,
                connection.database_name,
                connection.host,
                connection.username,
            ],
            onSelect: () => handleSelectConnection(connection.id),
        }));

        const savedQueryItems: CommandPaletteItem[] = savedQueries.map((item) => ({
            id: `saved-query:${item.id}`,
            title: item.title,
            subtitle: item.connection
                ? `${item.connection.name} · ${item.connection.database_name}`
                : item.folder || 'Saved query',
            kind: 'saved-query',
            icon: <Icon data={FileText} size={18}/>,
            keywords: [
                item.sql_text,
                item.folder ?? '',
                item.description ?? '',
            ],
            onSelect: () => handleOpenSavedQuery(item),
        }));

        return [
            ...actionItems,
            ...tabItems,
            ...connectionItems,
            ...savedQueryItems,
        ];
    }, [
        activeConnectionId,
        activeTab,
        connections,
        openCreateConnectionDialog,
        savedQueries,
        setRightPanel,
        tabs,
        handleCreateTab,
        handleRun,
        handleSelectTab,
        handleSelectConnection,
        handleOpenSavedQuery,
        handleDuplicateTab,
        handleCloseTab,
        handleTogglePin,
    ]);

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

    async function handleDuplicateTab(tab: QueryTabDto) {
        await handleCreateTab({
            title: `${tab.title || 'New Query'} copy`,
            sql_text: tab.sql_text,
            db_connection_id: tab.db_connection_id,
        });
    }

    async function handleCloseOtherTabs(tabId: number) {
        const tabsToClose = tabs.filter((tab) => tab.id !== tabId && !tab.is_pinned);

        for (const tab of tabsToClose) {
            removeTab(tab.id);
        }

        for (const tab of tabsToClose) {
            try {
                await deleteQueryTab(tab.id);
            } catch (error) {
                console.error(error);
            }
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

    async function detachTabsFromConnection(connectionId: number) {
        const affectedTabs = tabs.filter((tab) => tab.db_connection_id === connectionId);

        if (affectedTabs.length === 0) {
            return;
        }

        const updatedTabs = await Promise.all(
            affectedTabs.map((tab) =>
                updateQueryTab(tab.id, {
                    db_connection_id: null,
                }),
            ),
        );

        updatedTabs.forEach((tab) => upsertTab(tab));
    }

    async function handleCreateConnection(payload: CreateConnectionPayload | UpdateConnectionPayload) {
        setIsCreatingConnection(true);
        setConnectionDialogError(null);

        try {
            if (editingConnection) {
                const updated = await updateConnection(editingConnection.id, payload as UpdateConnectionPayload);

                updateConnectionInList(updated);

                if (activeConnectionId === updated.id) {
                    setActiveConnectionId(updated.id);
                }

                closeConnectionDialog();
                return;
            }

            const created = await createConnection(payload as CreateConnectionPayload);

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
                (editingConnection
                    ? 'Failed to update connection.'
                    : 'Failed to create connection.'),
            );
        } finally {
            setIsCreatingConnection(false);
        }
    }

    async function handleDeleteConnection(connection: { id: number; name: string }) {
        const confirmed = window.confirm(`Delete connection "${connection.name}"?`);

        if (!confirmed) {
            return;
        }

        try {
            await deleteConnection(connection.id);

            removeConnection(connection.id);
            await detachTabsFromConnection(connection.id);

            if (activeConnectionId === connection.id) {
                const nextConnection = connections.find((item) => item.id !== connection.id) ?? null;
                setActiveConnectionId(nextConnection?.id ?? null);
            }
        } catch (error) {
            console.error(error);
        }
    }

    async function handleTestConnection(payload: CreateConnectionPayload | UpdateConnectionPayload) {
        if (editingConnection) {
            return await testExistingConnection(editingConnection.id, payload);
        }

        return await testConnection(payload);
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
                initialConnection={editingConnection}
                onClose={closeConnectionDialog}
                onSubmit={handleCreateConnection}
                onTest={handleTestConnection}
            />

            <CommandPalette
                open={isCommandPaletteOpen}
                items={commandPaletteItems}
                onClose={() => setIsCommandPaletteOpen(false)}
            />

            <WorkspaceMainLayout
                left={
                    <ExplorerSidebar
                        connections={connections}
                        activeConnectionId={activeConnectionId}
                        onSelect={handleSelectConnection}
                        onCreateClick={openCreateConnectionDialog}
                        onEditClick={openEditConnectionDialog}
                        onDeleteClick={handleDeleteConnection}
                        onOpenSql={handleCreateTab}
                    />
                }
                centerTop={
                    <button
                        className="workspace-page__palette-button"
                        onClick={() => setIsCommandPaletteOpen(true)}
                    >
                        Command Palette · Ctrl/Cmd + K
                    </button>
                }
                tabs={
                    <QueryTabsBar
                        tabs={tabs}
                        activeTabId={activeTabId}
                        dirtyTabIds={dirtyTabIds}
                        onSelect={handleSelectTab}
                        onCreate={() => handleCreateTab()}
                        onClose={handleCloseTab}
                        onCloseOthers={handleCloseOtherTabs}
                        onTogglePin={handleTogglePin}
                        onDuplicate={handleDuplicateTab}
                    />
                }
                toolbar={
                    <EditorToolbar
                        connections={connections}
                        activeConnectionId={activeConnectionId}
                        isExecuting={isExecuting}
                        hasSelection={hasSelection}
                        onSelectConnection={handleSelectConnection}
                        onRun={() => handleRun('auto')}
                        onRunSelection={handleRunSelection}
                    />
                }
                editor={
                    <SqlEditorPane
                        value={activeTab?.sql_text ?? ''}
                        onChange={handleChangeSql}
                        onSelectionChange={handleEditorSelectionChange}
                        onRun={() => handleRun('auto')}
                    />
                }
                results={
                    <ResultsPanel
                        result={activeResult}
                        activeConnectionName={activeConnection?.name ?? null}
                        activeDatabaseName={activeConnection?.database_name ?? null}
                        activeTabTitle={activeTab?.title ?? null}
                    />
                }
                right={
                    <RightSidebarPanels
                        panel={rightPanel}
                        history={queryHistory}
                        savedQueries={savedQueries}
                        onChangePanel={setRightPanel}
                        onOpenHistoryItem={handleOpenHistoryItem}
                        onOpenSavedQuery={handleOpenSavedQuery}
                        onSaveCurrentQuery={handleSaveCurrentQuery}
                    />
                }
            />
        </>
    );
}
