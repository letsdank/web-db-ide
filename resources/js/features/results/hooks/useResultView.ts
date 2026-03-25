import type {ExecuteQueryResponse, QueryResultViewState} from "../../../types/queryResult";
import {useEffect, useMemo} from "react";
import {rowMatchesResultFilter} from "../lib/resultFilter";
import {useWorkspaceStore} from "../../../stores/workspaceStore";
import {buildVisibleResultColumns} from "../lib/resultColumns";

type SortDirection = 'asc' | 'desc';

/**
 * Fallback view state used before a tab-specific persisted bucket is created.
 *
 * The actual source of truth still lives in the workspace store.
 */
const EMPTY_RESULT_VIEW_STATE: QueryResultViewState = {
    filterValue: '',
    hiddenColumnNames: [],
    pinnedColumnNames: [],
    sortState: null,
};

/**
 * Compares two cell values for client-side sorting.
 *
 * Rules:
 * - nulls are pushed to the bottom
 * - numbers are compared numerically
 * - numeric-looking strings also try numeric comparison
 * - everything else falls back to localeCompare with numeric awareness
 */
function compareValues(a: unknown, b: unknown): number {
    if (a === null && b === null) {
        return 0;
    }

    if (a === null) {
        return 1;
    }

    if (b === null) {
        return -1;
    }

    if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
    }

    const aNum = Number(a);
    const bNum = Number(b);

    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return aNum - bNum;
    }

    return String(a).localeCompare(String(b), undefined, {
        numeric: true,
        sensitivity: 'base',
    });
}

/**
 * Derives the render-ready result-grid view for the active workspace tab.
 *
 * The hook bridges two layers:
 * - persisted view preferences from the workspace store
 * - the latest execution payload returned by the backend
 *
 * It never mutates the query result itself. Instead it projects that result
 * into a UI-specific view: visible columns, filtered rows and client-side sort.
 */
export function useResultView(result: ExecuteQueryResponse | null) {
    const activeTabId = useWorkspaceStore((state) => state.activeTabId);

    const resultViewState =
        useWorkspaceStore((state) =>
            activeTabId ? state.resultViewStateByTabId[activeTabId] : undefined,
        ) ?? EMPTY_RESULT_VIEW_STATE;

    const ensureResultViewState = useWorkspaceStore((state) => state.ensureResultViewState);
    const setResultFilterValue = useWorkspaceStore((state) => state.setResultFilterValue);
    const hideResultColumn = useWorkspaceStore((state) => state.hideResultColumn);
    const resetResultColumns = useWorkspaceStore((state) => state.resetResultColumns);
    const pinResultColumn = useWorkspaceStore((state) => state.pinResultColumn);
    const unpinResultColumn = useWorkspaceStore((state) => state.unpinResultColumn);
    const resetPinnedResultColumns = useWorkspaceStore((state) => state.resetPinnedResultColumns);
    const setResultSortState = useWorkspaceStore((state) => state.setResultSortState);
    const resetResultSorting = useWorkspaceStore((state) => state.resetResultSorting);
    const resetResultViewState = useWorkspaceStore((state) => state.resetResultViewState);

    /**
     * Lazily initializes persisted result-view state for the active tab.
     *
     * Tabs can exist before they ever produce a query result, so this bucket is
     * created on demand when the results layer becomes active.
     */
    useEffect(() => {
        if (activeTabId) {
            ensureResultViewState(activeTabId);
        }
    }, [activeTabId, ensureResultViewState]);

    const hiddenColumnNames = resultViewState.hiddenColumnNames;
    const pinnedColumnNames = resultViewState.pinnedColumnNames;
    const sortState = resultViewState.sortState as {
        columnName: string;
        direction: SortDirection;
    } | null;
    const filterValue = resultViewState.filterValue;

    /**
     * Memoized render projection of the raw backend result.
     *
     * Pipeline:
     * 1. bail out for null/error results
     * 2. build visible columns from hidden/pinned preferences
     * 3. filter rows against the current tokenized filter string
     * 4. apply client-side sorting, if configured
     * 5. remap each row to the projected visible column order
     */
    const visibleResult = useMemo(() => {
        if (!result || result.status !== 'success') {
            return null;
        }

        const visibleColumns = buildVisibleResultColumns(
            result.columns,
            hiddenColumnNames,
            pinnedColumnNames,
        );

        const nextRows = result.rows.filter((row) =>
            rowMatchesResultFilter(row, visibleColumns, filterValue),
        );

        if (sortState) {
            const sourceColumnIndex = result.columns.findIndex(
                (column) => column.name === sortState.columnName,
            );

            if (sourceColumnIndex !== -1) {
                nextRows.sort((leftRow, rightRow) => {
                    const compared = compareValues(
                        leftRow[sourceColumnIndex],
                        rightRow[sourceColumnIndex],
                    );

                    return sortState.direction === 'asc' ? compared : -compared;
                });
            }
        }

        const projectedRows = nextRows.map((row) =>
            visibleColumns.map((column) => row[column.originalIndex]),
        );

        return {
            visibleColumns,
            rows: projectedRows,
            filteredRowCount: nextRows.length,
        };
    }, [result, hiddenColumnNames, pinnedColumnNames, sortState, filterValue]);

    /**
     * Wrapper actions below keep store writes safely scoped to the active tab.
     *
     * If there is no active tab, the results layer becomes effectively read-only.
     */
    function handleSetFilterValue(value: string) {
        if (!activeTabId) {
            return;
        }

        setResultFilterValue(activeTabId, value);
    }

    function handleHideColumn(columnName: string) {
        if (!activeTabId) {
            return;
        }

        hideResultColumn(activeTabId, columnName);
    }

    function handleResetColumns() {
        if (!activeTabId) {
            return;
        }

        resetResultColumns(activeTabId);
    }

    function handlePinColumn(columnName: string) {
        if (!activeTabId) {
            return;
        }

        pinResultColumn(activeTabId, columnName);
    }

    function handleUnpinColumn(columnName: string) {
        if (!activeTabId) {
            return;
        }

        unpinResultColumn(activeTabId, columnName);
    }

    function handleResetPinnedColumns() {
        if (!activeTabId) {
            return;
        }

        resetPinnedResultColumns(activeTabId);
    }

    function handleSetSortState(
        nextSortState: { columnName: string; direction: SortDirection } | null,
    ) {
        if (!activeTabId) {
            return;
        }

        setResultSortState(activeTabId, nextSortState);
    }

    function handleResetSorting() {
        if (!activeTabId) {
            return;
        }

        resetResultSorting(activeTabId);
    }

    function handleResetView() {
        if (!activeTabId) {
            return;
        }

        resetResultViewState(activeTabId);
    }

    return {
        hiddenColumnNames,
        sortState,
        filterValue,
        visibleResult,
        setFilterValue: handleSetFilterValue,
        setSortState: handleSetSortState,
        hideColumn: handleHideColumn,
        resetColumns: handleResetColumns,
        pinColumn: handlePinColumn,
        unpinColumn: handleUnpinColumn,
        resetPinnedColumns: handleResetPinnedColumns,
        resetSorting: handleResetSorting,
        resetView: handleResetView,
    };
}
