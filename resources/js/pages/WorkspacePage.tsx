import {useWorkspaceStore} from "../stores/workspaceStore";
import {useCallback, useEffect, useMemo, useState} from "react";
import {
    createConnection,
    deleteConnection,
    fetchConnections,
    testConnection,
    testExistingConnection,
    updateConnection
} from "../api/connections";
import {createQueryTab, deleteQueryTab, fetchQueryTabs, reorderQueryTabs, updateQueryTab} from "../api/queryTabs";
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

    // Не считаем "безопасными" CTE/SELECT, если внутри есть опасные ключевые слова.
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
                result_limit: 500,
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

    function withSequentialSortOrder(nextTabs: QueryTabDto[]): QueryTabDto[] {
        return nextTabs.map((tab, index) => ({
            ...tab,
            sort_order: index,
        }));
    }

    function moveTabInsideGroup(
        sourceTabs: QueryTabDto[],
        tabId: number,
        direction: 'left' | 'right',
    ): QueryTabDto[] {
        const targetTab = sourceTabs.find((tab) => tab.id === tabId);

        if (!targetTab) {
            return sourceTabs;
        }

        const sameGroupTabs = sourceTabs.filter((tab) => tab.is_pinned === targetTab.is_pinned);
        const groupIndex = sameGroupTabs.findIndex((tab) => tab.id === tabId);

        if (groupIndex === -1) {
            return sourceTabs;
        }

        const swapIndex = direction === 'left' ? groupIndex - 1 : groupIndex + 1;

        if (swapIndex < 0 || swapIndex >= sameGroupTabs.length) {
            return sourceTabs;
        }

        const reorderedGroup = [...sameGroupTabs];
        const [movedTab] = reorderedGroup.splice(groupIndex, 1);
        reorderedGroup.splice(swapIndex, 0, movedTab);

        const groupIds = new Set(reorderedGroup.map((tab) => tab.id));
        const nextTabs: QueryTabDto[] = [];
        let groupCursor = 0;

        for (const tab of sourceTabs) {
            if (groupIds.has(tab.id)) {
                nextTabs.push(reorderedGroup[groupCursor]);
                groupCursor += 1;
            } else {
                nextTabs.push(tab);
            }
        }

        return withSequentialSortOrder(nextTabs);
    }

    async function handleMoveTab(tab: QueryTabDto, direction: 'left' | 'right') {
        const nextTabs = moveTabInsideGroup(tabs, tab.id, direction);

        if (nextTabs === tabs) {
            return;
        }

        reorderTabs(nextTabs);

        try {
            const updatedTabs = await reorderQueryTabs(
                nextTabs.map((item) => ({
                    id: item.id,
                    sort_order: item.sort_order,
                })),
            );

            reorderTabs(updatedTabs);
        } catch (error) {
            console.error(error);
            replaceTabs(tabs);
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

            const refreshedTabs = tabs.map((item) =>
                item.id === updatedTab.id ? updatedTab : item,
            );

            const normalizedTabs = withSequentialSortOrder(
                [...refreshedTabs].sort((a, b) => {
                    if (a.is_pinned !== b.is_pinned) {
                        return Number(b.is_pinned) - Number(a.is_pinned);
                    }

                    if (a.sort_order !== b.sort_order) {
                        return a.sort_order - b.sort_order;
                    }

                    return a.id - b.id;
                }),
            );

            reorderTabs(normalizedTabs);

            const persistedTabs = await reorderQueryTabs(
                normalizedTabs.map((item) => ({
                    id: item.id,
                    sort_order: item.sort_order,
                })),
            );

            reorderTabs(persistedTabs);
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

    async function handleRenameTab(tab: QueryTabDto, title: string) {
        const normalizedTitle = title.trim() || 'New Query';
        const previousTab = tab;

        const nextTab: QueryTabDto = {
            ...tab,
            title: normalizedTitle,
        };

        upsertTab(nextTab);

        try {
            const updatedTab = await updateQueryTab(tab.id, {
                title: normalizedTitle,
            });

            upsertTab(updatedTab);
        } catch (error) {
            console.error(error);
            upsertTab(previousTab);
        }
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
                    error: responseData?.message || error?.message || 'Failed to execute query.',
                });
            }
        } finally {
            setTabExecuting(activeTab.id, false);
        }
    }

    async function handleChangeResultLimit(limit: 100 | 500 | 1000) {
        if (!activeTab) {
            return;
        }

        const updatedTab = await updateQueryTab(activeTab.id, {
            result_limit: limit,
        });

        upsertTab(updatedTab);
    }

    async function handleChangeResultLimitAndRerun(limit: 100 | 500 | 1000) {
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
                    error: responseData?.message || error?.message || 'Failed to execute query.',
                });
            }
        } finally {
            setTabExecuting(activeTab.id, false);
        }
    }

    async function handleRunSelection() {
        if (!activeTab?.selected_text?.trim()) {
            return;
        }

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

    function confirmDestructiveQuery(sql: string): boolean {
        if (!isPotentiallyDestructiveSql(sql)) {
            return true;
        }

        const preview = truncateSqlPreview(sql);

        return window.confirm(
            [
                'Potentially destructive SQL detected.',
                'Please confirm execution.',
                '',
                preview ? `SQL preview: ${preview}` : '',
            ].join('\n'),
        );
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
                        value={activeTab?.sql_text ?? ''}
                        onChange={handleChangeSql}
                        onSelectionChange={handleEditorSelectionChange}
                        onRun={() => handleRun('auto')}
                        onRunSelection={handleRunSelection}
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
