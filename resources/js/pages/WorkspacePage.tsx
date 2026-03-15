import {useWorkspaceStore} from "../stores/workspaceStore";
import {useCallback, useRef, useState} from "react";
import {updateQueryTab} from "../api/queryTabs";
import {ConnectionFormDialog} from "../components/workspace/ConnectionFormDialog";
import {QueryTabsBar} from "../components/workspace/QueryTabsBar";
import {EditorToolbar} from "../components/workspace/EditorToolbar";
import {SqlEditorPane, SqlEditorPaneHandle} from "../components/workspace/SqlEditorPane";
import {ResultsPanel} from "../features/results/components/ResultsPanel";
import {RightSidebarPanels} from "../components/workspace/RightSidebarPanels";
import {useDebouncedCallback} from "../hooks/useDebouncedCallback";
import {QueryTabDto} from "../types/queryTab";
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
