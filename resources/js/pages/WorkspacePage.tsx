import {useWorkspaceStore} from "../stores/workspaceStore";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
    createConnection,
    deleteConnection,
    fetchConnections,
    testConnection,
    testExistingConnection,
    updateConnection
} from "../api/connections";
import {fetchQueryTabs, updateQueryTab} from "../api/queryTabs";
import {fetchQueryHistory} from "../api/queryHistory";
import {createSavedQuery, fetchSavedQueries} from "../api/savedQueries";
import {executeQuery} from "../api/queries";
import {QueryHistoryDto} from "../types/queryHistory";
import {SavedQueryDto} from "../types/savedQuery";
import {ConnectionFormDialog} from "../components/workspace/ConnectionFormDialog";
import {QueryTabsBar} from "../components/workspace/QueryTabsBar";
import {EditorToolbar} from "../components/workspace/EditorToolbar";
import {SqlEditorPane, SqlEditorPaneHandle} from "../components/workspace/SqlEditorPane";
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
import {isEditableElement, isModKey} from "../lib/hotkeys";
import {EditorStatusBar} from "../components/workspace/EditorStatusBar";
import {useWorkspaceTabActions} from "../features/workspace/hooks/useWorkspaceTabActions";
import {useWorkspaceExecution} from "../features/workspace/hooks/useWorkspaceExecution";
import {useWorkspaceConnections} from "../features/workspace/hooks/useWorkspaceConnections";

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
        reorderTabs,
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
    const editorRef = useRef<SqlEditorPaneHandle | null>(null);

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

    const activeCursorPosition = useMemo(() => {
        const raw = activeTab?.cursor_position;

        if (!raw || typeof raw !== 'object') {
            return null;
        }

        const lineNumber = raw['lineNumber'];
        const column = raw['column'];

        if (typeof lineNumber !== 'number' || typeof column !== 'number') {
            return null;
        }

        return {
            lineNumber,
            column,
        };
    }, [activeTab?.cursor_position]);

    const activeSelectionRange = useMemo(() => {
        const raw = activeTab?.selection_range;

        if (!raw || typeof raw !== 'object') {
            return null;
        }

        const startLineNumber = raw['startLineNumber'];
        const endLineNumber = raw['endLineNumber'];

        if (typeof startLineNumber !== 'number' || typeof endLineNumber !== 'number') {
            return null;
        }

        return {
            startLineNumber,
            endLineNumber,
        };
    }, [activeTab?.selection_range]);

    const activeSelectedLineCount = useMemo(() => {
        if (!activeTab?.selected_text?.trim() || !activeSelectionRange) {
            return null;
        }

        return Math.max(
            1,
            activeSelectionRange.endLineNumber - activeSelectionRange.startLineNumber + 1,
        );
    }, [activeTab?.selected_text, activeSelectionRange]);

    const activeRowsMeta = useMemo(() => {
        if (!activeResult || activeResult.status !== 'success') {
            return {
                rowsCount: null,
                hasMoreRows: false,
            };
        }

        return {
            rowsCount: activeResult.row_count ?? activeResult.rows.length,
            hasMoreRows: Boolean(activeResult.has_more),
        };
    }, [activeResult]);

    const hasSelection = Boolean(activeTab?.selected_text?.trim());

    const activeTabIndex = useMemo(
        () => tabs.findIndex((tab) => tab.id === activeTabId),
        [tabs, activeTabId],
    );

    const focusEditor = useCallback(() => {
        editorRef.current?.focus();
    }, []);

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
        750,
    );

    const scheduleTabDraftPersist = useCallback((tab: QueryTabDto, payload: Partial<QueryTabDto>) => {
        persistTabDraft(tab.id, payload);
    }, [persistTabDraft]);

    const {
        handleCreateTab,
        handleSelectTab,
        handleCloseTab,
        handleCloseOtherTabs,
        handleDuplicateTab,
        handleRenameTab,
        handleMoveTab,
        handleTogglePin,
    } = useWorkspaceTabActions({
        tabs,
        activeTabId,
        activeConnectionId,
        setActiveConnectionId,
        addTab,
        upsertTab,
        removeTab,
        replaceTabs,
        reorderTabs,
        setActiveTabId,
        ensureTabState,
        scheduleTabDraftPersist,
    });

    const {
        handleRun,
        handleRunSelection,
        handleChangeResultLimitAndRerun,
    } = useWorkspaceExecution({
        activeTab,
        activeConnectionId,
        setTabExecuting,
        setTabResult,
        upsertTab,
        clearTabDirty,
        setQueryHistory,
        setRightPanel,
    });

    const {
        handleCreateConnection,
        handleDeleteConnection,
        handleTestConnection,
    } = useWorkspaceConnections({
        editingConnection,
        activeConnectionId,
        activeTab,
        connections,
        tabs,
        addConnection,
        updateConnectionInList,
        removeConnection,
        upsertTab,
        setActiveConnectionId,
        setIsCreatingConnection,
        setConnectionDialogError,
        closeConnectionDialog,
    });

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

    const handleSelectAdjacentTab = useCallback((direction: 'next' | 'prev') => {
        if (tabs.length === 0) {
            return;
        }

        const currentIndex = activeTabIndex >= 0 ? activeTabIndex : 0;
        const delta = direction === 'next' ? 1 : -1;
        const nextIndex = (currentIndex + delta + tabs.length) % tabs.length;
        const nextTab = tabs[nextIndex];

        if (!nextTab) {
            return;
        }

        void handleSelectTab(nextTab.id);
    }, [activeTabIndex, tabs, handleSelectTab]);

    useEffect(() => {
        function handleGlobalKeyDown(event: KeyboardEvent) {
            const key = event.key.toLowerCase();
            const editable = isEditableElement(event.target);

            if (isModKey(event) && key === 'k') {
                event.preventDefault();
                setIsCommandPaletteOpen(true);
                return;
            }

            if (isModKey(event) && key === 't' && !event.shiftKey) {
                event.preventDefault();
                void handleCreateTab();
                return;
            }

            if (isModKey(event) && key === 'w' && !event.shiftKey) {
                if (!activeTab || editable) {
                    return;
                }

                event.preventDefault();
                void handleCloseTab(activeTab.id);
                return;
            }

            if (isModKey(event) && key === '1' && !event.shiftKey) {
                event.preventDefault();
                focusEditor();
                return;
            }

            if (isModKey(event) && event.shiftKey && event.key === '[') {
                event.preventDefault();
                handleSelectAdjacentTab('prev');
                return;
            }

            if (isModKey(event) && event.shiftKey && event.key === ']') {
                event.preventDefault();
                handleSelectAdjacentTab('next');
                return;
            }
        }

        window.addEventListener('keydown', handleGlobalKeyDown);

        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [
        activeTab,
        focusEditor,
        handleCloseTab,
        handleCreateTab,
        handleSelectAdjacentTab,
    ]);

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
                title: 'Run full query',
                subtitle: activeTab?.title ?? 'Active tab',
                kind: 'action',
                icon: <Icon data={Magnifier} size={18}/>,
                keywords: ['run execute query sql current active full all'],
                onSelect: () => handleRun('full'),
            },
            {
                id: 'action:run-selection',
                title: 'Run selection',
                subtitle: hasSelection ? 'Selected SQL fragment' : 'No SQL selected',
                kind: 'action',
                icon: <Icon data={Magnifier} size={18}/>,
                keywords: ['run execute selection highlighted sql fragment'],
                onSelect: () => handleRun('selection'),
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
        hasSelection,
        savedQueries,
        tabs,
        openCreateConnectionDialog,
        setRightPanel,
        handleCreateTab,
        handleRun,
        handleSelectTab,
        handleSelectConnection,
        handleOpenSavedQuery,
        handleDuplicateTab,
        handleCloseTab,
        handleTogglePin,
    ]);

    if (isBooting) {
        return <div className="workspace-page__boot">Loading...</div>;
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
                        onMoveLeft={(tab) => handleMoveTab(tab, 'left')}
                        onMoveRight={(tab) => handleMoveTab(tab, 'right')}
                        onRename={handleRenameTab}
                    />
                }
                toolbar={
                    <EditorToolbar
                        connections={connections}
                        activeConnectionId={activeConnectionId}
                        isExecuting={isExecuting}
                        hasSelection={hasSelection}
                        onSelectConnection={handleSelectConnection}
                        onRun={() => handleRun('full')}
                        onRunSelection={handleRunSelection}
                    />
                }
                editor={
                    <SqlEditorPane
                        ref={editorRef}
                        value={activeTab?.sql_text ?? ''}
                        onChange={handleChangeSql}
                        onSelectionChange={handleEditorSelectionChange}
                        onRun={() => handleRun('auto')}
                        onRunSelection={handleRunSelection}
                    />
                }
                editorFooter={
                    <EditorStatusBar
                        connectionName={activeConnection?.name ?? null}
                        resultLimit={activeTab?.result_limit ?? null}
                        cursorLine={activeCursorPosition?.lineNumber ?? null}
                        cursorColumn={activeCursorPosition?.column ?? null}
                        selectedText={activeTab?.selected_text ?? null}
                        selectedLineCount={activeSelectedLineCount}
                        isExecuting={isExecuting}
                        rowsCount={activeRowsMeta.rowsCount}
                        hasMoreRows={activeRowsMeta.hasMoreRows}
                    />
                }
                results={
                    <ResultsPanel
                        result={activeResult}
                        activeConnectionName={activeConnection?.name ?? null}
                        activeDatabaseName={activeConnection?.database_name ?? null}
                        activeTabTitle={activeTab?.title ?? null}
                        resultLimit={activeTab?.result_limit ?? 500}
                        onChangeResultLimit={handleChangeResultLimitAndRerun}
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
