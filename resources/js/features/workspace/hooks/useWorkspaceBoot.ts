import {useEffect} from "react";
import {fetchConnections} from "../../../api/connections";
import {fetchQueryTabs} from "../../../api/queryTabs";
import {fetchQueryHistory} from "../../../api/queryHistory";
import {fetchSavedQueries} from "../../../api/savedQueries";
import type {ConnectionDto} from "../../../types/connection";
import type {QueryTabDto} from "../../../types/queryTab";
import type {QueryHistoryDto} from "../../../types/queryHistory";
import type {SavedQueryDto} from "../../../types/savedQuery";

/**
 * Mutable workspace boot actions injected from the store layer.
 *
 * The hook deliberately depends on actions instead of importing the store
 * directly so it stays easy to test in isolation.
 */
interface Params {
    setBooting: (value: boolean) => void;

    setConnections: (connections: ConnectionDto[]) => void;
    setTabs: (tabs: QueryTabDto[]) => void;
    setQueryHistory: (items: QueryHistoryDto[]) => void;
    setSavedQueries: (items: SavedQueryDto[]) => void;

    setActiveTabId: (tabId: number | null) => void;
    setActiveConnectionId: (connectionId: number | null) => void;
    ensureTabState: (tabId: number) => void;
}

/**
 * Boots the initial workspace state on page load.
 *
 * This hook fetches the primary IDE datasets in parallel, drives the initial
 * active tab/connection pair and guards against late async writes after
 * unmount via a local cancellation flag.
 */
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
                const availableConnectionIds = new Set(connectionsData.map((connection) => connection.id));

                const initialTabConnectionId = (
                    initialTab?.db_connection_id != null &&
                    availableConnectionIds.has(initialTab.db_connection_id)
                )
                    ? initialTab.db_connection_id
                    : null;

                const initialConnectionId =
                    initialTabConnectionId ??
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
