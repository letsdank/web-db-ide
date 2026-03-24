import type {ExecuteQueryResponse, QueryResultViewState} from "../../../types/queryResult";
import {useEffect, useMemo} from "react";
import {rowMatchesResultFilter} from "../lib/resultFilter";
import {useWorkspaceStore} from "../../../stores/workspaceStore";

type SortDirection = 'asc' | 'desc';

const EMPTY_RESULT_VIEW_STATE: QueryResultViewState = {
    filterValue: '',
    hiddenColumnNames: [],
    sortState: null,
};

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
    const setResultSortState = useWorkspaceStore((state) => state.setResultSortState);
    const resetResultSorting = useWorkspaceStore((state) => state.resetResultSorting);
    const resetResultViewState = useWorkspaceStore((state) => state.resetResultViewState);

    useEffect(() => {
        if (activeTabId) {
            ensureResultViewState(activeTabId);
        }
    }, [activeTabId, ensureResultViewState]);

    const hiddenColumnNames = resultViewState.hiddenColumnNames;
    const sortState = resultViewState.sortState as {
        columnName: string;
        direction: SortDirection;
    } | null;
    const filterValue = resultViewState.filterValue;

    const visibleResult = useMemo(() => {
        if (!result || result.status !== 'success') {
            return null;
        }

        const visibleColumns = result.columns
            .map((column, index) => ({...column, originalIndex: index}))
            .filter((column) => !hiddenColumnNames.includes(column.name));

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
    }, [result, hiddenColumnNames, sortState, filterValue]);

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
        resetSorting: handleResetSorting,
        resetView: handleResetView,
    };
}
