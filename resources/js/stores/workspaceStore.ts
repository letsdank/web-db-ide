import {ConnectionDto} from "../types/connection";
import {QueryTabDto} from "../types/queryTab";
import {ExecuteQueryResponse} from "../types/queryResult";
import {create} from "zustand/react";
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

    isConnectionDialogOpen: boolean;
    isCreatingConnection: boolean;
    connectionDialogError: string | null;

    setBooting: (value: boolean) => void;

    setConnections: (connections: ConnectionDto[]) => void;
    addConnection: (connection: ConnectionDto) => void;

    setTabs: (tabs: QueryTabDto[]) => void;
    addTab: (tab: QueryTabDto) => void;
    upsertTab: (tab: QueryTabDto) => void;

    setActiveTabId: (id: number | null) => void;
    setActiveConnectionId: (id: number | null) => void;

    setQueryHistory: (items: QueryHistoryDto[]) => void;
    setSavedQueries: (items: SavedQueryDto[]) => void;
    addSavedQuery: (item: SavedQueryDto) => void;

    setRightPanel: (panel: WorkspaceRightPanel) => void;

    setTabExecuting: (tabId: number, value: boolean) => void;
    setTabResult: (tabId: number, result: ExecuteQueryResponse | null) => void;
    ensureTabState: (tabId: number) => void;

    openConnectionDialog: () => void;
    closeConnectionDialog: () => void;
    setIsCreatingConnection: (value: boolean) => void;
    setConnectionDialogError: (value: string | null) => void;
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

    isConnectionDialogOpen: false,
    isCreatingConnection: false,
    connectionDialogError: null,

    setBooting: (value) => set({isBooting: value}),

    setConnections: (connections) => set({connections}),
    addConnection: (connection) =>
        set((state) => ({
            connections: [...state.connections, connection].sort((a, b) => a.name.localeCompare(b.name)),
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

    setActiveTabId: (id) => set({activeTabId: id}),
    setActiveConnectionId: (id) => set({activeConnectionId: id}),

    setQueryHistory: (items) => set({queryHistory: items}),
    setSavedQueries: (items) => set({savedQueries: items}),
    addSavedQuery: (item) =>
        set((state) => ({
            savedQueries: [item, ...state.savedQueries],
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
            ...ensureTabStateRecord(state, tabId),
            [tabId]: {
                ...(ensureTabStateRecord(state, tabId)[tabId]),
                result,
            },
        })),

    ensureTabState: (tabId) =>
        set((state) => ({
            tabStateById: ensureTabStateRecord(state, tabId),
        })),

    openConnectionDialog: () =>
        set({
            isConnectionDialogOpen: true,
            connectionDialogError: null,
        }),

    closeConnectionDialog: () =>
        set((state) => {
            if (state.isCreatingConnection) {
                return state;
            }

            return {
                isConnectionDialogOpen: false,
                connectionDialogError: null,
            };
        }),

    setIsCreatingConnection: (value) => set({isCreatingConnection: value}),
    setConnectionDialogError: (value) => set({connectionDialogError: value}),
}));
