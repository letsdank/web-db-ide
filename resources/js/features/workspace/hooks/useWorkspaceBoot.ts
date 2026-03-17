import {useEffect} from "react";
import {fetchConnections} from "../../../api/connections";
import {fetchQueryTabs} from "../../../api/queryTabs";
import {fetchQueryHistory} from "../../../api/queryHistory";
import {fetchSavedQueries} from "../../../api/savedQueries";

interface Params {
    setBooting: (value: boolean) => void;

    setConnections: (connections: any[]) => void;
    setTabs: (tabs: any[]) => void;
    setQueryHistory: (items: any[]) => void;
    setSavedQueries: (items: any[]) => void;

    setActiveTabId: (tabId: number | null) => void;
    setActiveConnectionId: (connectionId: number | null) => void;
    ensureTabState: (tabId: number) => void;
}

export function useWorkspaceBoot({
                                     setBooting,
                                     setConnections,
                                     setTabs,
                                     setQueryHistory,
                                     setSavedQueries,
                                     setActiveTabId,
                                     setActiveConnectionId,
                                     ensureTabState,
                                 }: Params) {
    useEffect(() => {
        let cancelled = false;

        async function boot() {
            try {
                const [connectionsData, tabsData, historyData, savedQueriesData] = await Promise.all([
                    fetchConnections(),
                    fetchQueryTabs(),
                    fetchQueryHistory(),
                    fetchSavedQueries(),
                ]);

                if (cancelled) {
                    return;
                }

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
                if (!cancelled) {
                    setBooting(false);
                }
            }
        }

        void boot();

        return () => {
            cancelled = true;
        };
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
}
