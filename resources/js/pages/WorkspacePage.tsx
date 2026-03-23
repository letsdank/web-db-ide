import {useWorkspaceStore} from "../stores/workspaceStore";
import React, {useCallback, useMemo, useRef, useState} from "react";
import {ConnectionFormDialog} from "../components/workspace/ConnectionFormDialog";
import {QueryTabsBar} from "../components/workspace/QueryTabsBar";
import {EditorToolbar} from "../components/workspace/EditorToolbar";
import type {MonacoInstance, SqlEditorPaneHandle} from "../components/workspace/SqlEditorPane";
import {SqlEditorPane} from "../components/workspace/SqlEditorPane";
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
import {useI18n} from "../i18n";
import type {SaveQueryDialogSubmitPayload} from "../components/workspace/SaveQueryDialog";
import {SaveQueryDialog} from "../components/workspace/SaveQueryDialog";
import type {SavedQueryDto} from "../types/savedQuery";
import {useExplorerTree} from "../features/explorer/hooks/useExplorerTree";
import type {ExplorerTableDetailsDto, ExplorerTableDto} from "../types/explorer";
import type {ConnectionDto, DatabaseDriver, ExportConnectionDumpPayload} from "../types/connection";
import {exportConnectionDump} from "../api/connections";
import {showErrorToast, showSuccessToast} from "../lib/toast";
import type {ExportDumpTarget} from "../components/workspace/ExportDumpDialog";
import {ExportDumpDialog} from "../components/workspace/ExportDumpDialog";
import {
    buildErdTabInput,
    buildExplorerCountTabInput,
    buildExplorerMetadataTabInput,
    buildExplorerPreviewTabInput,
    buildExplorerSelectSql
} from "../features/explorer/lib/tableActions";
import {useSqlCompletionProvider} from "../features/editor/hooks/useSqlCompletionProvider";
import type {ErdTabMeta} from "../types/queryTab";
import {ErdPane} from "../features/erd/components/ErdPane";

const EMPTY_LOADING_SCHEMAS_BY_CONNECTION_ID: Record<number, boolean> = {};

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
        updateSavedQueryInList,

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
    const [editingSavedQuery, setEditingSavedQuery] = useState<SavedQueryDto | null>(null);
    const [exportDumpTarget, setExportDumpTarget] = useState<ExportDumpTarget | null>(null);
    const [isExportingDump, setIsExportingDump] = useState(false);
    const [exportDumpError, setExportDumpError] = useState<string | null>(null);

    const editorRef = useRef<SqlEditorPaneHandle | null>(null);
    const [monacoInstance, setMonacoInstance] = useState<MonacoInstance | null>(null);
    const handleMonacoMount = useCallback((monaco: MonacoInstance) => setMonacoInstance(monaco), []);

    const {t} = useI18n();

    const focusEditor = useCallback(() => {
        editorRef.current?.focus();
    }, []);

    const resolveConnectionDriver = useCallback((connectionId: number): DatabaseDriver => {
        return connections.find((connection) => connection.id === connectionId)?.driver ?? 'pgsql';
    }, [connections]);

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
        handleUpdateSavedQuery,
        handleOpenHistoryItem,
        handleOpenSavedQuery,
    } = useWorkspaceLibrary({
        activeTab,
        activeConnectionId,
        addSavedQuery,
        updateSavedQueryInList,
        setRightPanel,
        handleCreateTab,
    });

    const openSaveQueryDialog = useCallback(() => {
        if (!activeTab) {
            return;
        }

        setEditingSavedQuery(null);
        setSaveQueryDialogError(null);
        setIsSaveQueryDialogOpen(true);
    }, [activeTab]);

    const openEditSavedQueryDialog = useCallback((savedQuery: SavedQueryDto) => {
        setEditingSavedQuery(savedQuery);
        setSaveQueryDialogError(null);
        setIsSaveQueryDialogOpen(true);
        setRightPanel('saved');
    }, [setRightPanel]);

    const closeSaveQueryDialog = useCallback(() => {
        if (isSavingQuery) {
            return;
        }

        setIsSaveQueryDialogOpen(false);
        setEditingSavedQuery(null);
        setSaveQueryDialogError(null);
    }, [isSavingQuery]);

    const handleSubmitSaveQuery = useCallback(async (payload: SaveQueryDialogSubmitPayload) => {
        try {
            setIsSavingQuery(true);
            setSaveQueryDialogError(null);

            if (editingSavedQuery) {
                await handleUpdateSavedQuery(editingSavedQuery, payload);
            } else {
                await handleSaveCurrentQuery(payload);
            }

            setIsSaveQueryDialogOpen(false);
            setEditingSavedQuery(null);
        } catch (error: unknown) {
            const errorLike = typeof error === 'object' && error !== null
                ? error as {
                    response?: { data?: { message?: string } };
                    message?: string;
                }
                : null;

            setSaveQueryDialogError(
                errorLike?.response?.data?.message ||
                errorLike?.message ||
                (editingSavedQuery
                    ? t('workspace.failedToUpdateSavedQuery')
                    : t('workspace.failedToSaveQuery')),
            );
        } finally {
            setIsSavingQuery(false);
        }
    }, [editingSavedQuery, handleSaveCurrentQuery, handleUpdateSavedQuery, t]);

    const handleOpenTablePreview = useCallback(async (payload: {
        connectionId: number;
        schema: string | null;
        table: string;
    }) => {
        await handleCreateTab(buildExplorerPreviewTabInput({
            connectionId: payload.connectionId,
            driver: resolveConnectionDriver(payload.connectionId),
            schema: payload.schema,
            table: payload.table,
        }, 100));
    }, [handleCreateTab, resolveConnectionDriver]);

    const handleOpenTableCount = useCallback(async (payload: {
        connectionId: number;
        schema: string | null;
        table: string;
    }) => {
        await handleCreateTab(buildExplorerCountTabInput({
            connectionId: payload.connectionId,
            driver: resolveConnectionDriver(payload.connectionId),
            schema: payload.schema,
            table: payload.table,
        }));
    }, [handleCreateTab, resolveConnectionDriver]);

    const handleCopyTableSelect = useCallback(async (payload: {
        connectionId: number;
        schema: string | null;
        table: string;
    }) => {
        const sql = buildExplorerSelectSql({
            connectionId: payload.connectionId,
            driver: resolveConnectionDriver(payload.connectionId),
            schema: payload.schema,
            table: payload.table,
        });

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
        resolveConnectionDriver,
    ]);

    const {
        schemasByConnectionId,
        tablesBySchemaKey,
        detailsByTableKey,
        expandedConnectionIds,
        expandedSchemaKeys,
        expandedTableKeySet,
        loadingSchemasFor,
        loadingTablesFor,
        loadingDetailsFor,
        toggleConnection,
        toggleSchema,
        toggleTable,
        loadTableDetails,
    } = useExplorerTree({
        connections,
        activeConnectionId,
        onSelectConnection: (connectionId) => {
            void handleSelectConnection(connectionId);
        },
    });

    useSqlCompletionProvider({
        monaco: monacoInstance,
        detailsByTableKey,
        activeConnectionId,
        driver: activeConnection?.driver ?? null,
    });

    const handleOpenTableContextMenu = useCallback(async (
        event: React.MouseEvent,
        payload: {
            connectionId: number;
            schema: string;
            table: ExplorerTableDto;
            details?: ExplorerTableDetailsDto;
        },
    ) => {
        event.preventDefault();

        if (!payload.details) {
            void loadTableDetails(payload.connectionId, payload.schema, payload.table.table_name);
        }
    }, [loadTableDetails]);

    const handleOpenTableMetadata = useCallback(async (
        connectionId: number,
        schema: string,
        table: ExplorerTableDto,
        details?: ExplorerTableDetailsDto,
    ) => {
        const resolvedDetails = details ?? await loadTableDetails(connectionId, schema, table.table_name);

        await handleCreateTab(buildExplorerMetadataTabInput({
            connectionId,
            driver: resolveConnectionDriver(connectionId),
            schema,
            table: table.table_name,
        }, resolvedDetails?.columns ?? []));
    }, [handleCreateTab, loadTableDetails, resolveConnectionDriver]);

    const handleOpenSchemaErd = useCallback(async (connectionId: number, schema: string) => {
        // Switch to existing ERD for this schema instead of opening a new one
        const existing = tabs.find(
            (t) =>
                t.tab_type === 'erd' &&
                (t.meta as ErdTabMeta | null)?.connectionId === connectionId &&
                (t.meta as ErdTabMeta | null)?.schema === schema,
        );

        if (existing) {
            void handleSelectTab(existing.id);
            return;
        }

        await handleCreateTab(buildErdTabInput({connectionId, schema}));
    }, [tabs, handleSelectTab, handleCreateTab]);

    const loadingSchemasByConnectionId = useMemo<Record<number, boolean>>(() => {
        if (loadingSchemasFor === null) {
            return EMPTY_LOADING_SCHEMAS_BY_CONNECTION_ID;
        }

        return {
            [loadingSchemasFor]: true,
        };
    }, [loadingSchemasFor]);

    const handleExplorerOpenSelect = useCallback((connectionId: number, schema: string, table: ExplorerTableDto) => {
        void handleOpenTablePreview({
            connectionId,
            schema,
            table: table.table_name,
        });
    }, [handleOpenTablePreview]);

    const handleExplorerOpenCount = useCallback((connectionId: number, schema: string, table: ExplorerTableDto) => {
        void handleOpenTableCount({
            connectionId,
            schema,
            table: table.table_name,
        });
    }, [handleOpenTableCount]);

    const handleCopyTableFullName = useCallback((_connectionId: number, schema: string, table: ExplorerTableDto) => {
        void navigator.clipboard.writeText(
            schema ? `${schema}.${table.table_name}` : table.table_name,
        );
    }, []);

    const handleExplorerCopySelect = useCallback((connectionId: number, schema: string, table: ExplorerTableDto) => {
        void handleCopyTableSelect({
            connectionId,
            schema,
            table: table.table_name,
        });
    }, [handleCopyTableSelect]);

    const handleExplorerOpenSchemaErd = useCallback((connectionId: number, schema: string) => {
        void handleOpenSchemaErd(connectionId, schema);
    }, [handleOpenSchemaErd]);

    const openConnectionDumpDialog = useCallback((connection: ConnectionDto) => {
        setExportDumpError(null);
        setExportDumpTarget({
            connection,
            scope: 'database',
            schema: null,
            table: null,
        });
    }, []);

    const openSchemaDumpDialog = useCallback((connectionId: number, schema: string) => {
        const connection = connections.find((item) => item.id === connectionId);

        if (!connection) {
            return;
        }

        setExportDumpTarget(null);
        setExportDumpTarget({
            connection,
            scope: 'schema',
            schema,
            table: null,
        });
    }, [connections]);

    const openTableDumpDialog = useCallback((connectionId: number, schema: string, table: ExplorerTableDto) => {
        const connection = connections.find((item) => item.id === connectionId);

        if (!connection) {
            return;
        }

        setExportDumpTarget(null);
        setExportDumpTarget({
            connection,
            scope: 'table',
            schema,
            table: table.table_name,
        });
    }, [connections]);

    const closeExportDumpDialog = useCallback(() => {
        if (isExportingDump) {
            return;
        }

        setExportDumpTarget(null);
        setExportDumpError(null);
    }, [isExportingDump]);

    const handleExportDump = useCallback(async (payload: ExportConnectionDumpPayload) => {
        if (!exportDumpTarget) {
            return;
        }

        try {
            setIsExportingDump(true);
            setExportDumpError(null);

            await exportConnectionDump(exportDumpTarget.connection.id, payload);

            showSuccessToast(
                t('workspace.dumpExportSuccess'),
                t('workspace.exportDump'),
            );

            setExportDumpTarget(null);
        } catch (error: unknown) {
            const message = error instanceof Error
                ? error.message
                : t('workspace.dumpExportFailed');

            setExportDumpError(message);
        } finally {
            setIsExportingDump(false);
        }
    }, [exportDumpTarget, t]);

    const runQuickTableDumpExport = useCallback(async (
        payload: {
            connectionId: number;
            schema: string;
            table: string;
        },
        options: {
            section: 'schema' | 'data';
            successMessage: string;
        },
    ) => {
        const connection = connections.find((item) => item.id === payload.connectionId);

        if (!connection) {
            showErrorToast(t('workspace.dumpConnectionNotFound'), t('workspace.exportDump'));
            return;
        }

        const request: ExportConnectionDumpPayload = {
            format: 'plain',
            scope: 'table',
            schema: payload.schema,
            table: payload.table,
            section: options.section,
            clean: false,
            if_exists: false,
            no_owner: true,
            no_privileges: true,
            include_blobs: false,
        };

        try {
            await exportConnectionDump(connection.id, request);

            showSuccessToast(
                options.successMessage,
                t('workspace.exportDump'),
            );
        } catch (error: unknown) {
            const message = error instanceof Error
                ? error.message
                : t('workspace.dumpExportFailed');

            showErrorToast(message, t('workspace.exportDump'));
        }
    }, [connections, t]);

    const handleQuickExportTableSchema = useCallback(async (
        connectionId: number,
        schema: string,
        table: ExplorerTableDto,
    ) => {
        await runQuickTableDumpExport(
            {
                connectionId,
                schema,
                table: table.table_name,
            },
            {
                section: 'schema',
                successMessage: t('workspace.tableSchemaExportSuccess', {
                    table: `${schema}.${table.table_name}`,
                }),
            },
        );
    }, [runQuickTableDumpExport, t]);

    const handleQuickExportTableData = useCallback(async (
        connectionId: number,
        schema: string,
        table: ExplorerTableDto
    ) => {
        await runQuickTableDumpExport(
            {
                connectionId,
                schema,
                table: table.table_name,
            },
            {
                section: 'data',
                successMessage: t('workspace.tableDataExportSuccess', {
                    table: `${schema}.${table.table_name}`,
                }),
            },
        );
    }, [runQuickTableDumpExport, t]);

    const hiddenActiveConnectionByFilter = false;

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
                mode={editingSavedQuery ? 'edit' : 'create'}
                initialTitle={editingSavedQuery?.title ?? activeTab?.title ?? t('workspace.savedQuery')}
                initialFolder={editingSavedQuery?.folder ?? null}
                initialVisibility={editingSavedQuery?.visibility ?? 'private'}
                sqlText={editingSavedQuery?.sql_text ?? activeTab?.sql_text ?? ''}
                onClose={closeSaveQueryDialog}
                onSubmit={handleSubmitSaveQuery}
            />

            <ExportDumpDialog
                open={Boolean(exportDumpTarget)}
                loading={isExportingDump}
                error={exportDumpError}
                target={exportDumpTarget}
                onClose={closeExportDumpDialog}
                onSubmit={handleExportDump}
            />

            <CommandPalette
                open={isCommandPaletteOpen}
                items={commandPaletteItems}
                onClose={() => setIsCommandPaletteOpen(false)}
            />

            <WorkspaceMainLayout
                isErd={activeTab?.tab_type === 'erd'}
                left={
                    <ExplorerSidebar
                        connections={connections}
                        activeConnectionId={activeConnectionId}
                        loadingSchemasByConnectionId={loadingSchemasByConnectionId}
                        schemasByConnectionId={schemasByConnectionId}
                        expandedConnectionIds={expandedConnectionIds}
                        expandedSchemaKeys={expandedSchemaKeys}
                        expandedTableKeySet={expandedTableKeySet}
                        tablesBySchemaKey={tablesBySchemaKey}
                        detailsByTableKey={detailsByTableKey}
                        loadingTablesFor={loadingTablesFor}
                        loadingDetailsFor={loadingDetailsFor}
                        hiddenActiveConnectionByFilter={hiddenActiveConnectionByFilter}
                        onCreateConnection={openCreateConnectionDialog}
                        onToggleConnection={toggleConnection}
                        onEditConnection={openEditConnectionDialog}
                        onDeleteConnection={handleDeleteConnection}
                        onToggleSchema={toggleSchema}
                        onToggleTable={toggleTable}
                        onOpenTableContextMenu={handleOpenTableContextMenu}
                        onOpenSelect={handleExplorerOpenSelect}
                        onOpenCount={handleExplorerOpenCount}
                        onOpenMetadata={handleOpenTableMetadata}
                        onCopyFullName={handleCopyTableFullName}
                        onCopySelect={handleExplorerCopySelect}
                        onOpenSchemaErd={handleExplorerOpenSchemaErd}
                        onExportConnectionDump={openConnectionDumpDialog}
                        onExportSchemaDump={openSchemaDumpDialog}
                        onExportTableDump={openTableDumpDialog}
                        onQuickExportTableSchema={handleQuickExportTableSchema}
                        onQuickExportTableData={handleQuickExportTableData}
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
                    activeTab?.tab_type !== 'erd' ? <EditorToolbar
                        connections={connections}
                        activeConnectionId={activeConnectionId}
                        isExecuting={isExecuting}
                        hasSelection={hasSelection}
                        onSelectConnection={handleSelectConnection}
                        onRun={() => handleRun('full')}
                        onRunSelection={handleRunSelection}
                    /> : null
                }
                editor={
                    activeTab?.tab_type === 'erd' ? (
                        <ErdPane
                            connectionId={(activeTab.meta as ErdTabMeta).connectionId}
                            schema={(activeTab.meta as ErdTabMeta).schema}
                        />
                    ) : (
                        <SqlEditorPane
                            ref={editorRef}
                            value={activeTab?.sql_text ?? ''}
                            onChange={handleChangeSql}
                            onSelectionChange={handleEditorSelectionChange}
                            onRun={() => handleRun('auto')}
                            onRunSelection={handleRunSelection}
                            onMonacoMount={handleMonacoMount}
                        />
                    )
                }
                editorFooter={
                    activeTab?.tab_type !== 'erd' ? (
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
                    ) : null
                }
                results={
                    activeTab?.tab_type !== 'erd' ? <ResultsPanel
                        result={activeResult}
                        activeConnectionName={activeConnection?.name ?? null}
                        activeDatabaseName={activeConnection?.database_name ?? null}
                        activeTabTitle={activeTab?.title ?? null}
                        resultLimit={activeTab?.result_limit ?? 500}
                        onChangeResultLimit={handleChangeResultLimitAndRerun}
                    /> : null
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
                        onEditSavedQuery={openEditSavedQueryDialog}
                    />
                }
            />
        </>
    );
}
