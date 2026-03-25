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
 * Store actions required to bootstrap the initial workspace state.
 *
 * The hook receives actions instead of importing the store directly so it stays
 * easy to test and does not hard-couple boot orchestration to one store module.
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
 * Bootstraps the main workspace shell on first render.
 *
 * Responsibilities:
 * - fetch the core IDE datasets in parallel
 * - hydrate the store with connections, tabs, history and saved queries
 * - derive the initial active tab and active connection
 * - initialize runtime tab state for the first active tab
 * - prevent late async writes after unmount via a cancellation flag
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
