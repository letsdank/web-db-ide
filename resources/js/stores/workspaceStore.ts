import {ConnectionDto} from "../types/connection";
import {QueryTabDto} from "../types/queryTab";
import {ExecuteQueryResponse} from "../types/queryResult";
import {create} from "zustand/react";

interface WorkspaceState {
    connections: ConnectionDto[];
    tabs: QueryTabDto[];
    activeTabId: number | null;
    activeConnectionId: number | null;
    result: ExecuteQueryResponse | null;
    isExecuting: boolean;

    setConnections: (connections: ConnectionDto[]) => void;
    setTabs: (tabs: QueryTabDto[]) => void;
    setActiveTabId: (id: number | null) => void;
    setActiveConnectionId: (id: number | null) => void;
    setResult: (result: ExecuteQueryResponse | null) => void;
    setIsExecuting: (value: boolean) => void;
    upsertTab: (tab: QueryTabDto) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
    connections: [],
    tabs: [],
    activeTabId: null,
    activeConnectionId: null,
    result: null,
    isExecuting: false,

    setConnections: (connections) => set({connections}),
    setTabs: (tabs) =>
        set({
            tabs,
            activeTabId: get().activeTabId ?? tabs[0].id ?? null,
        }),
    setActiveTabId: (id) => set({activeTabId: id}),
    setActiveConnectionId: (id) => set({activeConnectionId: id}),
    setResult: (result) => set({result}),
    setIsExecuting: (value) => set({isExecuting: value}),
    upsertTab: (tab) => {
        const tabs = [...get().tabs];
        const index = tabs.findIndex((item) => item.id === tab.id);

        if (index === -1) {
            tabs.push(tab);
        } else {
            tabs[index] = tab;
        }

        set({tabs});
    },
}));
