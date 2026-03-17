import type {ExecuteQueryResponse} from "../../../types/queryResult";
import {useMemo, useState} from "react";

type SortDirection = 'asc' | 'desc';

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
    const [hiddenColumnNames, setHiddenColumnNames] = useState<string[]>([]);
    const [sortState, setSortState] = useState<{
        columnName: string;
        direction: SortDirection;
    } | null>(null);

    const visibleResult = useMemo(() => {
        if (!result || result.status !== 'success') {
            return null;
        }

        const visibleColumns = result.columns
            .map((column, index) => ({...column, originalIndex: index}))
            .filter((column) => !hiddenColumnNames.includes(column.name));

        const nextRows = [...result.rows];

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
        };
    }, [result, hiddenColumnNames, sortState]);

    function hideColumn(columnName: string) {
        setHiddenColumnNames((prev) =>
            prev.includes(columnName) ? prev : [...prev, columnName],
        );
    }

    function resetColumns() {
        setHiddenColumnNames([]);
    }

    function resetSorting() {
        setSortState(null);
    }

    function resetView() {
        setHiddenColumnNames([]);
        setSortState(null);
    }

    return {
        hiddenColumnNames,
        sortState,
        visibleResult,
        setSortState,
        hideColumn,
        resetColumns,
        resetSorting,
        resetView,
    };
}
