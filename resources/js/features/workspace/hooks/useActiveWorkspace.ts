import type {QueryTabDto} from "../../../types/queryTab";
import type {ConnectionDto} from "../../../types/connection";
import {useMemo} from "react";
import type {ExecuteQueryResponse} from "../../../types/queryResult";

/**
 * Minimal execution state shape required by the active-workspace selector.
 *
 * The hook only cares about the running flag and the latest result payload.
 */
interface TabExecutionStateLike {
    isExecuting?: boolean;
    result?: ExecuteQueryResponse | null;
}

/**
 * Inputs required to derive the currently active workspace context.
 */
interface Params {
    tabs: QueryTabDto[];
    connections: ConnectionDto[];
    activeTabId: number | null;
    activeConnectionId: number | null;
    tabStateById: Record<number, TabExecutionStateLike | undefined>;
}

/**
 * Builds the render-ready "active workspace" view from normalized store state.
 *
 * This hook is a selector/composition layer. It combines:
 * - the active tab DTO
 * - the active connection DTO
 * - volatile execution state for the active tab
 * - editor metadata such as cursor position and selection range
 * - lightweight result metadata for status bard and toolbars
 */
export function useActiveWorkspace({
                                       tabs,
                                       connections,
                                       activeTabId,
                                       activeConnectionId,
                                       tabStateById,
                                   }: Params) {
    /**
     * The tab currently selected in the shell.
     */
    const activeTab = useMemo(
        () => tabs.find((tab) => tab.id === activeTabId) ?? null,
        [tabs, activeTabId],
    );

    /**
     * The connection currently selected in the workspace toolbar.
     */
    const activeConnection = useMemo(
        () => connections.find((connection) => connection.id === activeConnectionId),
        [connections, activeConnectionId],
    );

    /**
     * Runtime execution state associated with the active tab.
     */
    const activeTabState = useMemo(
        () => (activeTabId ? tabStateById[activeTabId] ?? null : null),
        [activeTabId, tabStateById],
    );

    const activeResult = activeTabState?.result ?? null;
    const isExecuting = activeTabState?.isExecuting ?? false;

    /**
     * Normalized cursor position extracted from serialized tab metadata.
     *
     * Returns null when the payload is absent or malformed.
     */
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

    /**
     * Normalized selection range extracted from serialized tab metadata.
     *
     * Returns null when the payload is absent or malformed.
     */
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

    /**
     * Number of selected editor lines, if the user currently has SQL selected.
     */
    const activeSelectedLineCount = useMemo(() => {
        if (!activeTab?.selected_text?.trim() || !activeSelectionRange) {
            return null;
        }

        return Math.max(
            1,
            activeSelectionRange.endLineNumber - activeSelectionRange.startLineNumber + 1,
        );
    }, [activeTab?.selected_text, activeSelectionRange]);

    /**
     * Lightweight rows meta derived from the active result payload.
     *
     * This keeps status/toolbars from depending on the full result-grid logic.
     */
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

    /**
     * Convenience flag for selection-aware actions like "run selection".
     */
    const hasSelection = Boolean(activeTab?.selected_text?.trim());

    /**
     * Visual index of the active tab in the current tab list.
     */
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
