import {useEffect, useMemo, useState} from "react";
import {ConnectionDto} from "../types/connection";
import {QueryTabDto} from "../types/queryTab";
import {ExecuteQueryResponse} from "../types/queryResult";
import {createConnection, CreateConnectionPayload, fetchConnections} from "../api/connections";
import {createQueryTab, fetchQueryTabs, updateQueryTab} from "../api/queryTabs";
import {executeQuery} from "../api/queries";
import {ConnectionsSidebar} from "../components/workspace/ConnectionsSidebar";
import {QueryTabsBar} from "../components/workspace/QueryTabsBar";
import {EditorToolbar} from "../components/workspace/EditorToolbar";
import {SqlEditorPane} from "../components/workspace/SqlEditorPane";
import {ResultsPanel} from "../components/workspace/ResultsPanel";
import {ConnectionFormDialog} from "../components/workspace/ConnectionFormDialog";

export function WorkspacePage() {
    const [connections, setConnections] = useState<ConnectionDto[]>([]);
    const [tabs, setTabs] = useState<QueryTabDto[]>([]);
    const [activeTabId, setActiveTabId] = useState<number | null>(null);
    const [activeConnectionId, setActiveConnectionId] = useState<number | null>(null);
    const [result, setResult] = useState<ExecuteQueryResponse | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [isBooting, setIsBooting] = useState(true);

    const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);
    const [isCreatingConnection, setIsCreatingConnection] = useState(false);
    const [connectionDialogError, setConnectionDialogError] = useState<string | null>(null);

    const activeTab = useMemo(
        () => tabs.find((tab) => tab.id === activeTabId) ?? null,
        [tabs, activeTabId],
    );

    useEffect(() => {
        async function boot() {
            try {
                const [connectionsData, tabsData] = await Promise.all([
                    fetchConnections(),
                    fetchQueryTabs(),
                ]);

                setConnections(connectionsData);
                setTabs(tabsData);

                const initialTabId = tabsData[0]?.id ?? null;
                setActiveTabId(initialTabId);

                const initialConnectionId =
                    tabsData[0]?.db_connection_id ??
                    connectionsData[0]?.id ??
                    null;

                setActiveConnectionId(initialConnectionId);
            } catch (error) {
                console.error(error);
            } finally {
                setIsBooting(false);
            }
        }

        void boot();
    }, []);

    async function handleCreateTab() {
        try {
            const tab = await createQueryTab({
                db_connection_id: activeConnectionId,
                title: 'New Query',
                sql_text: '',
            });

            setTabs((prev) => [...prev, tab]);
            setActiveTabId(tab.id);

            if (tab.db_connection_id) {
                setActiveConnectionId(tab.db_connection_id);
            }
        } catch (error) {
            console.error(error);
        }
    }

    async function handleChangeSql(value: string) {
        if (!activeTab) {
            return;
        }

        const previousTabs = tabs;

        setTabs((prev) =>
            prev.map((tab) =>
                tab.id === activeTab.id
                    ? {
                        ...tab,
                        sql_text: value,
                    }
                    : tab,
            ),
        );

        try {
            const updatedTab = await updateQueryTab(activeTab.id, {
                sql_text: value,
                db_connection_id: activeConnectionId,
            });

            setTabs((prev) =>
                prev.map((tab) => (tab.id === updatedTab.id ? updatedTab : tab))
            );
        } catch (error) {
            console.error(error);
            setTabs(previousTabs);
        }
    }

    async function handleSelectTab(id: number) {
        setActiveTabId(id);

        const tab = tabs.find((item) => item.id === id);

        if (tab?.db_connection_id) {
            setActiveConnectionId(tab.db_connection_id);
        }
    }

    async function handleRun() {
        if (!activeTab || !activeConnectionId) {
            return;
        }

        setIsExecuting(true);

        try {
            const response = await executeQuery({
                connection_id: activeConnectionId,
                query_tab_id: activeTab.id,
                sql: activeTab.sql_text,
                selected_sql: null,
                max_rows: 500,
                save_to_history: true,
            });

            setResult(response);

            const updatedTab = await updateQueryTab(activeTab.id, {
                last_executed_at: new Date().toISOString(),
                db_connection_id: activeConnectionId,
            });

            setTabs((prev) =>
                prev.map((tab) => (tab.id === updatedTab.id ? updatedTab : tab))
            );
        } catch (error) {
            console.error(error);
        } finally {
            setIsExecuting(false);
        }
    }

    async function handleSelectConnection(id: number | null) {
        setActiveConnectionId(id);

        if (!activeTab) {
            return;
        }

        try {
            const updatedTab = await updateQueryTab(activeTab.id, {
                db_connection_id: id,
            });

            setTabs((prev) =>
                prev.map((tab) => (tab.id === updatedTab.id ? updatedTab : tab))
            );
        } catch (error) {
            console.error(error);
        }
    }

    function openConnectionDialog() {
        setConnectionDialogError(null);
        setIsConnectionDialogOpen(true);
    }

    function closeConnectionDialog() {
        if (isCreatingConnection) {
            return;
        }

        setIsConnectionDialogOpen(false);
        setConnectionDialogError(null);
    }

    async function handleCreateConnection(payload: CreateConnectionPayload) {
        setIsCreatingConnection(true);
        setConnectionDialogError(null);

        try {
            const created = await createConnection(payload);

            setConnections((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            setActiveConnectionId(created.id);

            setIsConnectionDialogOpen(false);

            if (activeTab) {
                const updatedTab = await updateQueryTab(activeTab.id, {
                    db_connection_id: created.id,
                });

                setTabs((prev) =>
                    prev.map((tab) => (tab.id === updatedTab.id ? updatedTab : tab)),
                );
            }
        } catch (error: any) {
            console.error(error);

            const message =
                error?.response?.data?.message ||
                error?.message ||
                'Failed to create connection.';

            setConnectionDialogError(message);
        } finally {
            setIsCreatingConnection(false);
        }
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
                        height: 'calc(100vh-32px)',
                        display: 'grid',
                        gridTemplateColumns: '200px 1fr',
                        gap: 16,
                    }}
                >
                    <ConnectionsSidebar
                        connections={connections}
                        activeConnectionId={activeConnectionId}
                        onSelect={handleSelectConnection}
                        onCreateClick={openConnectionDialog}
                    />

                    <div style={{
                        display: 'grid',
                        gridTemplateRows: '72px 72px 1fr 320px',
                        gap: 16,
                        minHeight: 0,
                    }}
                    >
                        <QueryTabsBar
                            tabs={tabs}
                            activeTabId={activeTabId}
                            onSelect={handleSelectTab}
                            onCreate={handleCreateTab}
                        />

                        <EditorToolbar
                            connections={connections}
                            activeConnectionId={activeConnectionId}
                            isExecuting={isExecuting}
                            onSelectConnection={handleSelectConnection}
                            onRun={handleRun}
                        />

                        <div style={{minHeight: 0}}>
                            <SqlEditorPane
                                value={activeTab?.sql_text ?? ''}
                                onChange={handleChangeSql}
                            />
                        </div>

                        <div style={{minHeight: 0}}>
                            <ResultsPanel result={result}/>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
