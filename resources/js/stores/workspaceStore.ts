import type {ConnectionDto} from "../types/connection";
import type {QueryTabDto} from "../types/queryTab";
import type {ExecuteQueryResponse, QueryResultViewState, ResultSortDirection} from "../types/queryResult";
import {create} from "zustand";
import type {QueryHistoryDto} from "../types/queryHistory";
import type {SavedQueryDto} from "../types/savedQuery";

/**
 * Right sidebar mode in the workspace shell.
 */
export type WorkspaceRightPanel = 'history' | 'saved';

/**
 * Per-tab volatile execution state.
 *
 * This state is intentionally kept separate from persisted tab DTOs because
 * execution flags and result payloads are UI/session concerns, not tab model
 * fields stored in the backend.
 */
export interface TabExecutionState {
    isExecuting: boolean;
    result: ExecuteQueryResponse | null;
}

/**
 * Central workspace store contract for the IDE workspace.
 *
 * The store combines four layers of state:
 * - bootstrapped backend data (connections, tabs, history, saved queries)
 * - transient shell/UI state (dialogs, active selections, sidebar mode)
 * - per-tab runtime execution state (loading flags and last query result)
 * - per-tab persisted result-view state (filters, hidden columns, sorting, pinning)
 *
 * The split between execution state and result-view state is intentional:
 * execution payloads are replaced whenever a query is re-run, while result-view
 * preferences should survive tab switches and continue to shape the same result
 * grid UX for that tab.
 */
interface WorkspaceState {
    isBooting: boolean;

    connections: ConnectionDto[];
    tabs: QueryTabDto[];
    activeTabId: number | null;
    activeConnectionId: number | null;

    queryHistory: QueryHistoryDto[];
    savedQueries: SavedQueryDto[];
    rightPanel: WorkspaceRightPanel;

    tabStateById: Record<number, TabExecutionState>;

    /**
     * Persisted per-tab result grid preferences.
     *
     * Unlike TabExecutionState, this bucket is not about the last execution
     * lifecycle itself. It stores how the user wants to look at the result:
     * current filter, hidden columns, pinned columns and active sort.
     */
    resultViewStateByTabId: Record<number, QueryResultViewState>;
    dirtyTabIds: number[];

    isConnectionDialogOpen: boolean;
    isCreatingConnection: boolean;
    editingConnection: ConnectionDto | null;
    connectionDialogError: string | null;

    setBooting: (value: boolean) => void;

    setConnections: (connections: ConnectionDto[]) => void;
    addConnection: (connection: ConnectionDto) => void;

    setTabs: (tabs: QueryTabDto[]) => void;
    replaceTabs: (tabs: QueryTabDto[]) => void;
    reorderTabs: (tabs: QueryTabDto[]) => void;
    addTab: (tab: QueryTabDto) => void;
    upsertTab: (tab: QueryTabDto) => void;
    removeTab: (tabId: number) => void;

    setActiveTabId: (id: number | null) => void;
    setActiveConnectionId: (id: number | null) => void;

    setQueryHistory: (items: QueryHistoryDto[]) => void;
    setSavedQueries: (items: SavedQueryDto[]) => void;
    addSavedQuery: (item: SavedQueryDto) => void;
    updateSavedQueryInList: (item: SavedQueryDto) => void;

    setRightPanel: (panel: WorkspaceRightPanel) => void;

    setTabExecuting: (tabId: number, value: boolean) => void;
    setTabResult: (tabId: number, result: ExecuteQueryResponse | null) => void;
    ensureTabState: (tabId: number) => void;

    ensureResultViewState: (tabId: number) => void;
    setResultFilterValue: (tabId: number, value: string) => void;
    hideResultColumn: (tabId: number, columnName: string) => void;
    resetResultColumns: (tabId: number) => void;
    setResultSortState: (
        tabId: number,
        sortState: { columnName: string; direction: ResultSortDirection } | null,
    ) => void;
    resetResultSorting: (tabId: number) => void;
    resetResultViewState: (tabId: number) => void;

    pinResultColumn: (tabId: number, columnName: string) => void;
    unpinResultColumn: (tabId: number, columnName: string) => void;
    resetPinnedResultColumns: (tabId: number) => void;

    markTabDirty: (tabId: number) => void;
    clearTabDirty: (tabId: number) => void;

    openCreateConnectionDialog: () => void;
    openEditConnectionDialog: (connection: ConnectionDto) => void;
    closeConnectionDialog: () => void;
    setIsCreatingConnection: (value: boolean) => void;
    setConnectionDialogError: (value: string | null) => void;

    updateConnectionInList: (connection: ConnectionDto) => void;
    removeConnection: (connectionId: number) => void;
}

/**
 * Creates an empty result-view state for a tab.
 *
 * This is the canonical baseline used when:
 * - a tab is created for the first time
 * - result-view state is lazily initialized
 * - the user performs a full "reset view" action
 */
function createDefaultResultViewState(): QueryResultViewState {
    return {
        filterValue: '',
        hiddenColumnNames: [],
        pinnedColumnNames: [],
        sortState: null,
    };
}

/**
 * Ensures that the store contains a runtime execution bucket for the tab.
 *
 * This helper is used by execution-related actions so callers do not have to
 * care whether a tab was already initialized in tabStateById.
 */
function ensureTabStateRecord(
    state: WorkspaceState,
    tabId: number,
): Record<number, TabExecutionState> {
    if (state.tabStateById[tabId]) {
        return state.tabStateById;
    }

    return {
        ...state.tabStateById,
        [tabId]: {
            isExecuting: false,
            result: null,
        },
    };
}

/**
 * Ensures that the store contains a persisted result-view bucket for the tab.
 *
 * Unlike tabStateById, this record stores user-facing grid preferences rather
 * than execution lifecycle data. It is lazily initialized because not every
 * tab needs result state immediately.
 */
function ensureResultViewStateRecord(
    state: WorkspaceState,
    tabId: number,
): Record<number, QueryResultViewState> {
    if (state.resultViewStateByTabId[tabId]) {
        return state.resultViewStateByTabId;
    }

    return {
        ...state.resultViewStateByTabId,
        [tabId]: createDefaultResultViewState(),
    };
}

/**
 * Resolves the next active tab after one tab has been removed.
 *
 * Strategy:
 * - keep the current active tab if some other tab was removed
 * - otherwise prefer the previous visual neighbor
 * - fall back to the first remaining tab
 */
function pickNextActiveTabId(
    tabs: QueryTabDto[],
    removedTabId: number,
    currentActiveTabId: number | null,
): number | null {
    if (tabs.length === 0) {
        return null;
    }

    if (currentActiveTabId !== removedTabId) {
        return currentActiveTabId;
    }

    const removedIndex = tabs.findIndex((tab) => tab.id === removedTabId);

    if (removedIndex === -1) {
        return tabs[tabs.length - 1]?.id ?? null;
    }

    return tabs[Math.max(0, removedIndex - 1)]?.id ?? tabs[0].id ?? null;
}

/**
 * Main Zustand store for the database IDE workspace.
 *
 * The store intentionally keeps query execution state and result-view state
 * side-by-side:
 * - tabStateById answers "what happened when this tab last ran?"
 * - resultViewStateByTabId answers "how should this tab's result be displayed?"
 *
 * That separation makes it possible to re-run queries without losing view
 * preferences and to preserve grid UX while switching between tabs.
 */
export const useWorkspaceStore = create<WorkspaceState>((set) => ({
    isBooting: true,

    connections: [],
    tabs: [],
    activeTabId: null,
    activeConnectionId: null,

    queryHistory: [],
    savedQueries: [],
    rightPanel: 'history',

    tabStateById: {},
    resultViewStateByTabId: {},
    dirtyTabIds: [],

    isConnectionDialogOpen: false,
    isCreatingConnection: false,
    connectionDialogError: null,
    editingConnection: null,

    setBooting: (value) => set({isBooting: value}),

    setConnections: (connections) => set({connections}),
    addConnection: (connection) =>
        set((state) => ({
            connections: [...state.connections, connection].sort((a, b) => a.name.localeCompare(b.name)),
        })),

    updateConnectionInList: (connection) =>
        set((state) => ({
            connections: state.connections
                .map((item) => item.id === connection.id ? connection : item)
                .sort((a, b) => a.name.localeCompare(b.name)),
            activeConnectionId: state.activeConnectionId === connection.id
                ? connection.id
                : state.activeConnectionId,
        })),

    removeConnection: (connectionId) =>
        set((state) => ({
            connections: state.connections.filter((item) => item.id !== connectionId),
            activeConnectionId: state.activeConnectionId === connectionId
                ? null
                : state.activeConnectionId,
        })),

    setTabs: (tabs) =>
        set((state) => {
            const nextTabState = {...state.tabStateById};
            const nextResultViewState = {...state.resultViewStateByTabId};

            for (const tab of tabs) {
                if (!nextTabState[tab.id]) {
                    nextTabState[tab.id] = {
                        isExecuting: false,
                        result: null,
                    };
                }

                if (!nextResultViewState[tab.id]) {
                    nextResultViewState[tab.id] = createDefaultResultViewState();
                }
            }

            return {
                tabs,
                activeTabId: state.activeTabId ?? tabs[0]?.id ?? null,
                tabStateById: nextTabState,
                resultViewStateByTabId: nextResultViewState,
            };
        }),

    replaceTabs: (tabs) =>
        set((state) => {
            const nextTabState: Record<number, TabExecutionState> = {};
            const nextResultViewState: Record<number, QueryResultViewState> = {};

            for (const tab of tabs) {
                nextTabState[tab.id] = state.tabStateById[tab.id] ?? {
                    isExecuting: false,
                    result: null,
                };

                nextResultViewState[tab.id] =
                    state.resultViewStateByTabId[tab.id] ?? createDefaultResultViewState();
            }

            return {
                tabs,
                activeTabId: tabs.some((tab) => tab.id === state.activeTabId)
                    ? state.activeTabId
                    : tabs[0]?.id ?? null,
                tabStateById: nextTabState,
                resultViewStateByTabId: nextResultViewState,
                dirtyTabIds: state.dirtyTabIds.filter((id) => tabs.some((tab) => tab.id === id)),
            };
        }),

    reorderTabs: (tabs) =>
        set((state) => {
            const nextTabState: Record<number, TabExecutionState> = {};
            const nextResultViewState: Record<number, QueryResultViewState> = {};

            for (const tab of tabs) {
                nextTabState[tab.id] = state.tabStateById[tab.id] ?? {
                    isExecuting: false,
                    result: null,
                };

                nextResultViewState[tab.id] =
                    state.resultViewStateByTabId[tab.id] ?? createDefaultResultViewState();
            }

            return {
                tabs,
                activeTabId: tabs.some((tab) => tab.id === state.activeTabId)
                    ? state.activeTabId
                    : tabs[0]?.id ?? null,
                tabStateById: nextTabState,
                resultViewStateByTabId: nextResultViewState,
                dirtyTabIds: state.dirtyTabIds.filter((id) => tabs.some((tab) => tab.id === id)),
            };
        }),

    addTab: (tab) =>
        set((state) => ({
            tabs: [...state.tabs, tab],
            activeTabId: tab.id,
            activeConnectionId: tab.db_connection_id ?? state.activeConnectionId,
            tabStateById: {
                ...state.tabStateById,
                [tab.id]: {
                    isExecuting: false,
                    result: null,
                },
            },
            resultViewStateByTabId: {
                ...state.resultViewStateByTabId,
                [tab.id]: state.resultViewStateByTabId[tab.id] ?? createDefaultResultViewState(),
            },
        })),

    upsertTab: (tab) =>
        set((state) => {
            const index = state.tabs.findIndex((item) => item.id === tab.id);
            const tabs = [...state.tabs];

            if (index === -1) {
                tabs.push(tab);
            } else {
                tabs[index] = tab;
            }

            return {
                tabs,
                tabStateById: {
                    ...state.tabStateById,
                    [tab.id]: state.tabStateById[tab.id] ?? {
                        isExecuting: false,
                        result: null,
                    },
                },
                resultViewStateByTabId: {
                    ...state.resultViewStateByTabId,
                    [tab.id]: state.resultViewStateByTabId[tab.id] ?? createDefaultResultViewState(),
                },
            };
        }),

    /**
     * Removes a tab and cleans up all state buckets owned by that tab.
     *
     * This includes both volatile execution data and persisted result-view
     * preferences so closed tabs do not leave orphaned UI state in memory.
     */
    removeTab: (tabId) =>
        set((state) => {
            const previousTabs = state.tabs;
            const nextTabs = previousTabs.filter((tab) => tab.id !== tabId);
            const nextActiveTabId = pickNextActiveTabId(previousTabs, tabId, state.activeTabId);

            const nextTabState = {...state.tabStateById};
            delete nextTabState[tabId];

            const nextResultViewState = {...state.resultViewStateByTabId};
            delete nextResultViewState[tabId];

            return {
                tabs: nextTabs,
                activeTabId: nextActiveTabId,
                activeConnectionId:
                    nextTabs.find((tab) => tab.id === nextActiveTabId)?.db_connection_id ?? state.activeConnectionId,
                tabStateById: nextTabState,
                resultViewStateByTabId: nextResultViewState,
                dirtyTabIds: state.dirtyTabIds.filter((id) => id !== tabId),
            };
        }),

    setActiveTabId: (id) => set({activeTabId: id}),
    setActiveConnectionId: (id) => set({activeConnectionId: id}),

    setQueryHistory: (items) => set({queryHistory: items}),
    setSavedQueries: (items) => set({savedQueries: items}),
    addSavedQuery: (item) =>
        set((state) => ({
            savedQueries: [item, ...state.savedQueries],
        })),
    updateSavedQueryInList: (item) =>
        set((state) => ({
            savedQueries: state.savedQueries.map((savedQuery) =>
                savedQuery.id === item.id ? item : savedQuery,
            ),
        })),

    setRightPanel: (panel) => set({rightPanel: panel}),

    setTabExecuting: (tabId, value) =>
        set((state) => {
            const nextTabState = ensureTabStateRecord(state, tabId);

            return {
                tabStateById: {
                    ...nextTabState,
                    [tabId]: {
                        ...nextTabState[tabId],
                        isExecuting: value,
                    },
                },
            };
        }),

    setTabResult: (tabId, result) =>
        set((state) => {
            const nextTabState = ensureTabStateRecord(state, tabId);

            return {
                tabStateById: {
                    ...nextTabState,
                    [tabId]: {
                        ...nextTabState[tabId],
                        result,
                    },
                },
            };
        }),

    ensureTabState: (tabId) =>
        set((state) => ({
            tabStateById: ensureTabStateRecord(state, tabId),
        })),

    /**
     * Result-grid view state actions bound to a specific tab.
     *
     * These actions mutate only presentation preferences for an already loaded
     * result set. They must not affect the underlying query text or execution
     * state and are expected to survive tab switches.
     */
    ensureResultViewState: (tabId) =>
        set((state) => ({
            resultViewStateByTabId: ensureResultViewStateRecord(state, tabId),
        })),

    setResultFilterValue: (tabId, value) =>
        set((state) => {
            const nextResultViewState = ensureResultViewStateRecord(state, tabId);

            return {
                resultViewStateByTabId: {
                    ...nextResultViewState,
                    [tabId]: {
                        ...nextResultViewState[tabId],
                        filterValue: value,
                    },
                },
            };
        }),

    hideResultColumn: (tabId, columnName) =>
        set((state) => {
            const nextResultViewState = ensureResultViewStateRecord(state, tabId);
            const currentState = nextResultViewState[tabId];

            if (currentState.hiddenColumnNames.includes(columnName)) {
                return state;
            }

            return {
                resultViewStateByTabId: {
                    ...nextResultViewState,
                    [tabId]: {
                        ...currentState,
                        hiddenColumnNames: [...currentState.hiddenColumnNames, columnName],
                    },
                },
            };
        }),

    resetResultColumns: (tabId) =>
        set((state) => {
            const nextResultViewState = ensureResultViewStateRecord(state, tabId);

            return {
                resultViewStateByTabId: {
                    ...nextResultViewState,
                    [tabId]: {
                        ...nextResultViewState[tabId],
                        hiddenColumnNames: [],
                    },
                },
            };
        }),

    setResultSortState: (tabId, sortState) =>
        set((state) => {
            const nextResultViewState = ensureResultViewStateRecord(state, tabId);

            return {
                resultViewStateByTabId: {
                    ...nextResultViewState,
                    [tabId]: {
                        ...nextResultViewState[tabId],
                        sortState,
                    },
                },
            };
        }),

    resetResultSorting: (tabId) =>
        set((state) => {
            const nextResultViewState = ensureResultViewStateRecord(state, tabId);

            return {
                resultViewStateByTabId: {
                    ...nextResultViewState,
                    [tabId]: {
                        ...nextResultViewState[tabId],
                        sortState: null,
                    },
                },
            };
        }),

    /**
     * Fully resets result-grid preferences for the tab back to defaults.
     *
     * This clears filtering, hidden columns, pinned columns and sorting in one
     * shot without touching the underlying query result payload.
     */
    resetResultViewState: (tabId) =>
        set((state) => ({
            resultViewStateByTabId: {
                ...state.resultViewStateByTabId,
                [tabId]: createDefaultResultViewState(),
            },
        })),

    pinResultColumn: (tabId, columnName) =>
        set((state) => {
            const nextResultViewState = ensureResultViewStateRecord(state, tabId);
            const currentState = nextResultViewState[tabId];

            if (currentState.pinnedColumnNames.includes(columnName)) {
                return state;
            }

            return {
                resultViewStateByTabId: {
                    ...nextResultViewState,
                    [tabId]: {
                        ...currentState,
                        pinnedColumnNames: [...currentState.pinnedColumnNames, columnName],
                    },
                },
            };
        }),

    unpinResultColumn: (tabId, columnName) =>
        set((state) => {
            const nextResultViewState = ensureResultViewStateRecord(state, tabId);
            const currentState = nextResultViewState[tabId];

            return {
                resultViewStateByTabId: {
                    ...nextResultViewState,
                    [tabId]: {
                        ...currentState,
                        pinnedColumnNames: currentState.pinnedColumnNames.filter(
                            (name) => name !== columnName,
                        ),
                    },
                },
            };
        }),

    resetPinnedResultColumns: (tabId) =>
        set((state) => {
            const nextResultViewState = ensureResultViewStateRecord(state, tabId);

            return {
                resultViewStateByTabId: {
                    ...nextResultViewState,
                    [tabId]: {
                        ...nextResultViewState[tabId],
                        pinnedColumnNames: [],
                    },
                },
            };
        }),

    markTabDirty: (tabId) =>
        set((state) => ({
            dirtyTabIds: state.dirtyTabIds.includes(tabId)
                ? state.dirtyTabIds
                : [...state.dirtyTabIds, tabId],
        })),

    clearTabDirty: (tabId) =>
        set((state) => ({
            dirtyTabIds: state.dirtyTabIds.filter((id) => id !== tabId),
        })),

    openCreateConnectionDialog: () =>
        set({
            isConnectionDialogOpen: true,
            editingConnection: null,
            connectionDialogError: null,
        }),

    openEditConnectionDialog: (connection) =>
        set({
            isConnectionDialogOpen: true,
            editingConnection: connection,
            connectionDialogError: null,
        }),

    closeConnectionDialog: () =>
        set((state) => {
            if (state.isCreatingConnection) {
                return state;
            }

            return {
                isConnectionDialogOpen: false,
                editingConnection: null,
                connectionDialogError: null,
            };
        }),

    setIsCreatingConnection: (value) => set({isCreatingConnection: value}),
    setConnectionDialogError: (value) => set({connectionDialogError: value}),
}));
