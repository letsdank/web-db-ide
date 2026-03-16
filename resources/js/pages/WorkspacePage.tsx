import {useWorkspaceStore} from "../stores/workspaceStore";
import {useCallback, useRef, useState} from "react";
import {ConnectionFormDialog} from "../components/workspace/ConnectionFormDialog";
import {QueryTabsBar} from "../components/workspace/QueryTabsBar";
import {EditorToolbar} from "../components/workspace/EditorToolbar";
import {SqlEditorPane, SqlEditorPaneHandle} from "../components/workspace/SqlEditorPane";
import {ResultsPanel} from "../features/results/components/ResultsPanel";
import {RightSidebarPanels} from "../components/workspace/RightSidebarPanels";
import {CommandPalette} from "../features/command-palette/components/CommandPalette";
import {WorkspaceMainLayout} from "../features/workspace/components/WorkspaceMainLayout";
import {ExplorerSidebar} from "../features/explorer/components/ExplorerSidebar";
import {EditorStatusBar} from "../components/workspace/EditorStatusBar";
import {useWorkspaceTabActions} from "../features/workspace/hooks/useWorkspaceTabActions";
import {useWorkspaceExecution} from "../features/workspace/hooks/useWorkspaceExecution";
import {useWorkspaceConnections} from "../features/workspace/hooks/useWorkspaceConnections";
import {useWorkspaceCommandPalette} from "../features/workspace/hooks/useWorkspaceCommandPalette";
import {useWorkspaceHotkeys} from "../features/workspace/hooks/useWorkspaceHotkeys";
import {useWorkspaceBoot} from "../features/workspace/hooks/useWorkspaceBoot";
import {useWorkspaceLibrary} from "../features/workspace/hooks/useWorkspaceLibrary";
import {useActiveWorkspace} from "../features/workspace/hooks/useActiveWorkspace";
import {useWorkspaceDraft} from "../features/workspace/hooks/useWorkspaceDraft";
import {buildCountSql, buildPreviewSql, buildSelectSql} from "../features/explorer/lib/sql";
import {useI18n} from "../i18n";
import {SaveQueryDialog, SaveQueryDialogSubmitPayload} from "../components/workspace/SaveQueryDialog";

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
    const [isSaveQueryDialogOpen, setIsSaveQueryDialogOpen] = useState(false);
    const [isSavingQuery, setIsSavingQuery] = useState(false);
    const [saveQueryDialogError, setSaveQueryDialogError] = useState<string | null>(null);

    const editorRef = useRef<SqlEditorPaneHandle | null>(null);
    const {t} = useI18n();

    const focusEditor = useCallback(() => {
        editorRef.current?.focus();
    }, []);

    const {
        activeTab,
        activeConnection,
        activeResult,
        isExecuting,
        activeCursorPosition,
        activeSelectedLineCount,
        activeRowsMeta,
        hasSelection,
        activeTabIndex,
    } = useActiveWorkspace({
        tabs,
        connections,
        activeTabId,
        activeConnectionId,
        tabStateById,
    });

    const {
        scheduleTabDraftPersist,
        handleChangeSql,
        handleEditorSelectionChange,
        handleSelectConnection,
    } = useWorkspaceDraft({
        activeTab,
        activeConnectionId,
        upsertTab,
        markTabDirty,
        clearTabDirty,
        setActiveConnectionId,
    });

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

    useWorkspaceBoot({
        setBooting,
        setConnections,
        setTabs,
        setQueryHistory,
        setSavedQueries,
        setActiveTabId,
        setActiveConnectionId,
        ensureTabState,
    });

    const {
        handleSaveCurrentQuery,
        handleOpenHistoryItem,
        handleOpenSavedQuery,
    } = useWorkspaceLibrary({
        activeTab,
        activeConnectionId,
        addSavedQuery,
        setRightPanel,
        handleCreateTab,
    });

    const openSaveQueryDialog = useCallback(() => {
        if (!activeTab) {
            return;
        }

        setSaveQueryDialogError(null);
        setIsSaveQueryDialogOpen(true);
    }, [activeTab]);

    const closeSaveQueryDialog = useCallback(() => {
        if (isSavingQuery) {
            return;
        }

        setIsSaveQueryDialogOpen(false);
        setSaveQueryDialogError(null);
    }, [isSavingQuery]);

    const handleSubmitSaveQuery = useCallback(async (payload: SaveQueryDialogSubmitPayload) => {
        try {
            setIsSavingQuery(true);
            setSaveQueryDialogError(null);

            await handleSaveCurrentQuery(payload);

            setIsSaveQueryDialogOpen(false);
        } catch (error: any) {
            setSaveQueryDialogError(
                error?.response?.data?.message ||
                error?.message ||
                t('workspace.failedToSaveQuery'),
            );
        } finally {
            setIsSavingQuery(false);
        }
    }, [handleSaveCurrentQuery, t]);

    const handleOpenTablePreview = useCallback(async (payload: {
        connectionId: number;
        schema: string | null;
        table: string;
    }) => {
        await handleCreateTab({
            title: `${payload.table} Preview`,
            sql_text: buildPreviewSql(payload.schema, payload.table, 100),
            db_connection_id: payload.connectionId,
        });
    }, [handleCreateTab]);

    const handleOpenTableCount = useCallback(async (payload: {
        connectionId: number;
        schema: string | null;
        table: string;
    }) => {
        await handleCreateTab({
            title: `${payload.table} Count`,
            sql_text: buildCountSql(payload.schema, payload.table),
            db_connection_id: payload.connectionId,
        });
    }, [handleCreateTab]);

    const handleCopyTableSelect = useCallback(async (payload: {
        connectionId: number;
        schema: string | null;
        table: string;
    }) => {
        const sql = buildSelectSql(payload.schema, payload.table);

        if (activeTab) {
            if (activeConnectionId !== payload.connectionId) {
                await handleSelectConnection(payload.connectionId);
            }

            await handleChangeSql(sql);
            return;
        }

        await handleCreateTab({
            title: `${payload.table} Query`,
            sql_text: sql,
            db_connection_id: payload.connectionId,
        });
    }, [
        activeConnectionId,
        activeTab,
        handleChangeSql,
        handleCreateTab,
        handleSelectConnection,
    ]);

    const commandPaletteItems = useWorkspaceCommandPalette({
        activeConnectionId,
        activeTab,
        connections,
        tabs,
        savedQueries,
        hasSelection,
        openCreateConnectionDialog,
        setRightPanel,
        handleCreateTab: () => handleCreateTab(),
        handleRun,
        handleSelectTab,
        handleSelectConnection,
        handleOpenSavedQuery,
        handleDuplicateTab,
        handleCloseTab,
        handleTogglePin,
    });

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

    useWorkspaceHotkeys({
        activeTabId,
        isCommandPaletteOpen,
        onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
        onCreateTab: handleCreateTab,
        onCloseActiveTab: handleCloseTab,
        onFocusEditor: focusEditor,
        onSelectAdjacentTab: handleSelectAdjacentTab,
    });

    if (isBooting) {
        return <div className="workspace-page__boot">{t('common.loading')}</div>;
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

            <SaveQueryDialog
                open={isSaveQueryDialogOpen}
                loading={isSavingQuery}
                error={saveQueryDialogError}
                initialTitle={activeTab?.title?.trim() || t('workspace.newQuery')}
                initialFolder={t('workspace.generalFolder')}
                initialVisibility="private"
                sqlText={activeTab?.sql_text ?? ''}
                onClose={closeSaveQueryDialog}
                onSubmit={handleSubmitSaveQuery}
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
                        onOpenTablePreview={handleOpenTablePreview}
                        onOpenTableCount={handleOpenTableCount}
                        onCopyTableSelect={handleCopyTableSelect}
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
                        canSaveCurrentQuery={Boolean(activeTab)}
                        onChangePanel={setRightPanel}
                        onOpenHistoryItem={handleOpenHistoryItem}
                        onOpenSavedQuery={handleOpenSavedQuery}
                        onOpenSaveQueryDialog={openSaveQueryDialog}
                    />
                }
            />
        </>
    );
}
