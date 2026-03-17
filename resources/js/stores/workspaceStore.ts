import {ConnectionDto} from "../types/connection";
import {QueryTabDto} from "../types/queryTab";
import {ExecuteQueryResponse} from "../types/queryResult";
import {create} from "zustand";
import {QueryHistoryDto} from "../types/queryHistory";
import {SavedQueryDto} from "../types/savedQuery";

export type WorkspaceRightPanel = 'history' | 'saved';

export interface TabExecutionState {
    isExecuting: boolean;
    result: ExecuteQueryResponse | null;
}

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

function pickNextActiveTabId(tabs: QueryTabDto[], removedTabId: number, currentActiveTabId: number | null): number | null {
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

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
    isBooting: true,

    connections: [],
    tabs: [],
    activeTabId: null,
    activeConnectionId: null,

    queryHistory: [],
    savedQueries: [],
    rightPanel: 'history',

    tabStateById: {},
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

            for (const tab of tabs) {
                if (!nextTabState[tab.id]) {
                    nextTabState[tab.id] = {
                        isExecuting: false,
                        result: null,
                    };
                }
            }

            return {
                tabs,
                activeTabId: state.activeTabId ?? tabs[0]?.id ?? null,
                tabStateById: nextTabState,
            };
        }),

    replaceTabs: (tabs) =>
        set((state) => {
            const nextTabState: Record<number, TabExecutionState> = {};

            for (const tab of tabs) {
                nextTabState[tab.id] = state.tabStateById[tab.id] ?? {
                    isExecuting: false,
                    result: null,
                };
            }

            return {
                tabs,
                activeTabId: tabs.some((tab) => tab.id === state.activeTabId)
                    ? state.activeTabId
                    : tabs[0]?.id ?? null,
                tabStateById: nextTabState,
                dirtyTabIds: state.dirtyTabIds.filter((id) => tabs.some((tab) => tab.id === id)),
            };
        }),

    reorderTabs: (tabs) =>
        set((state) => {
            const nextTabState: Record<number, TabExecutionState> = {};

            for (const tab of tabs) {
                nextTabState[tab.id] = state.tabStateById[tab.id] ?? {
                    isExecuting: false,
                    result: null,
                };
            }

            return {
                tabs,
                activeTabId: tabs.some((tab) => tab.id === state.activeTabId)
                    ? state.activeTabId
                    : tabs[0]?.id ?? null,
                tabStateById: nextTabState,
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
            };
        }),

    removeTab: (tabId) =>
        set((state) => {
            const previousTabs = state.tabs;
            const nextTabs = previousTabs.filter((tab) => tab.id !== tabId);
            const nextActiveTabId = pickNextActiveTabId(previousTabs, tabId, state.activeTabId);

            const nextTabState = {...state.tabStateById};
            delete nextTabState[tabId];

            return {
                tabs: nextTabs,
                activeTabId: nextActiveTabId,
                activeConnectionId:
                    nextTabs.find((tab) => tab.id === nextActiveTabId)?.db_connection_id ?? state.activeConnectionId,
                tabStateById: nextTabState,
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
        set((state) => ({
            tabStateById: {
                ...ensureTabStateRecord(state, tabId),
                [tabId]: {
                    ...(ensureTabStateRecord(state, tabId)[tabId]),
                    isExecuting: value,
                },
            },
        })),

    setTabResult: (tabId, result) =>
        set((state) => ({
            tabStateById: {
                ...ensureTabStateRecord(state, tabId),
                [tabId]: {
                    ...(ensureTabStateRecord(state, tabId)[tabId]),
                    result,
                },
            }
        })),

    ensureTabState: (tabId) =>
        set((state) => ({
            tabStateById: ensureTabStateRecord(state, tabId),
        })),

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
