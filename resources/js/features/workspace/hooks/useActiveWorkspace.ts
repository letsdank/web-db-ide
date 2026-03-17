import type {QueryTabDto} from "../../../types/queryTab";
import type {ConnectionDto} from "../../../types/connection";
import {useMemo} from "react";
import type {ExecuteQueryResponse} from "../../../types/queryResult";

interface TabExecutionStateLike {
    isExecuting?: boolean;
    result?: ExecuteQueryResponse | null;
}

interface Params {
    tabs: QueryTabDto[];
    connections: ConnectionDto[];
    activeTabId: number | null;
    activeConnectionId: number | null;
    tabStateById: Record<number, TabExecutionStateLike | undefined>;
}

export function useActiveWorkspace({
                                       tabs,
                                       connections,
                                       activeTabId,
                                       activeConnectionId,
                                       tabStateById,
                                   }: Params) {
    const activeTab = useMemo(
        () => tabs.find((tab) => tab.id === activeTabId) ?? null,
        [tabs, activeTabId],
    );

    const activeConnection = useMemo(
        () => connections.find((connection) => connection.id === activeConnectionId),
        [connections, activeConnectionId],
    );

    const activeTabState = useMemo(
        () => (activeTabId ? tabStateById[activeTabId] ?? null : null),
        [activeTabId, tabStateById],
    );

    const activeResult = activeTabState?.result ?? null;
    const isExecuting = activeTabState?.isExecuting ?? false;

    const activeCursorPosition = useMemo(() => {
        const raw = activeTab?.cursor_position;

        if (!raw || typeof raw !== 'object') {
            return null;
        }

        const lineNumber = raw['lineNumber'];
        const column = raw['column'];

        if (typeof lineNumber !== 'number' || typeof column !== 'number') {
            return null;
        }

        return {
            lineNumber,
            column,
        };
    }, [activeTab?.cursor_position]);

    const activeSelectionRange = useMemo(() => {
        const raw = activeTab?.selection_range;

        if (!raw || typeof raw !== 'object') {
            return null;
        }

        const startLineNumber = raw['startLineNumber'];
        const endLineNumber = raw['endLineNumber'];

        if (typeof startLineNumber !== 'number' || typeof endLineNumber !== 'number') {
            return null;
        }

        return {
            startLineNumber,
            endLineNumber,
        };
    }, [activeTab?.selection_range]);

    const activeSelectedLineCount = useMemo(() => {
        if (!activeTab?.selected_text?.trim() || !activeSelectionRange) {
            return null;
        }

        return Math.max(
            1,
            activeSelectionRange.endLineNumber - activeSelectionRange.startLineNumber + 1,
        );
    }, [activeTab?.selected_text, activeSelectionRange]);

    const activeRowsMeta = useMemo(() => {
        if (!activeResult || activeResult.status !== 'success') {
            return {
                rowsCount: null,
                hasMoreRows: false,
            };
        }

        return {
            rowsCount: activeResult.row_count ?? activeResult.rows.length,
            hasMoreRows: Boolean(activeResult.has_more),
        };
    }, [activeResult]);

    const hasSelection = Boolean(activeTab?.selected_text?.trim());

    const activeTabIndex = useMemo(
        () => tabs.findIndex((tab) => tab.id === activeTabId),
        [tabs, activeTabId],
    );

    return {
        activeTab,
        activeConnection,
        activeTabState,
        activeResult,
        isExecuting,
        activeCursorPosition,
        activeSelectionRange,
        activeSelectedLineCount,
        activeRowsMeta,
        hasSelection,
        activeTabIndex,
    };
}
