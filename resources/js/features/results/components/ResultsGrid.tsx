import React, {useLayoutEffect, useMemo, useRef, useState} from "react";
import {Label, Text} from "@gravity-ui/uikit";
import {useI18n} from "../../../i18n";

interface VisibleColumn {
    name: string;
    native_type?: string | null;
    originalIndex: number;
    isPinned: boolean;
}

interface Props {
    columns: VisibleColumn[];
    rows: unknown[][];
    sortState: { columnName: string; direction: 'asc' | 'desc' } | null;
    onHeaderContextMenu: (
        event: React.MouseEvent,
        payload: { columnName: string; columnIndex: number }
    ) => void;
    onCellContextMenu: (
        event: React.MouseEvent,
        payload: { cell: unknown, row: unknown[]; columnName: string }
    ) => void;
    onCellDoubleClick: (cell: unknown) => void;
}

export function ResultsGrid({
                                columns,
                                rows,
                                sortState,
                                onHeaderContextMenu,
                                onCellContextMenu,
                                onCellDoubleClick,
                            }: Props) {
    const {t} = useI18n();
    const headerRefs = useRef<Array<HTMLTableCellElement | null>>([]);
    const [columnWidths, setColumnWidths] = useState<number[]>([]);

    useLayoutEffect(() => {
        const updateWidths = () => {
            const nextWidths = columns.map((_, index) =>
                Math.ceil(headerRefs.current[index]?.getBoundingClientRect().width ?? 0),
            );

            setColumnWidths((prev) => {
                if (
                    prev.length === nextWidths.length &&
                    prev.every((value, index) => value === nextWidths[index])
                ) {
                    return prev;
                }

                return nextWidths;
            });
        };

        updateWidths();

        if (typeof ResizeObserver === 'undefined') {
            return;
        }

        const observer = new ResizeObserver(() => {
            updateWidths();
        });

        columns.forEach((_, index) => {
            const node = headerRefs.current[index];
            if (node) {
                observer.observe(node);
            }
        });

        return () => {
            observer.disconnect();
        };
    }, [columns]);

    const pinnedOffsets = useMemo(() => {
        let offset = 0;

        return columns.map((column, index) => {
            if (!column.isPinned) {
                return null;
            }

            const currentOffset = offset;
            offset += columnWidths[index] ?? 0;

            return currentOffset;
        });
    }, [columns, columnWidths]);

    const lastPinnedColumnIndex = useMemo(() => {
        for (let index = columns.length - 1; index >= 0; index -= 1) {
            if (columns[index]?.isPinned) {
                return index;
            }
        }

        return -1;
    }, [columns]);

    function getPinnedStyle(index: number, isHeader: boolean): React.CSSProperties | undefined {
        if (!columns[index]?.isPinned) {
            return undefined;
        }

        return {
            position: 'sticky',
            left: pinnedOffsets[index] ?? 0,
            zIndex: isHeader ? 3 : 2,
        };
    }

    if (rows.length === 0) {
        return (
            <div className="results-grid results-grid--empty">
                <Text variant="body-2" color="secondary">
                    {t('workspace.noMatchingRows')}
                </Text>
            </div>
        );
    }

    return (
        <div className="results-grid">
            <table className="results-grid__table">
                <thead>
                <tr>
                    {columns.map((column, columnIndex) => {
                        const isSorted = sortState?.columnName === column.name;
                        const isPinnedEdge = column.isPinned && columnIndex === lastPinnedColumnIndex;

                        return (
                            <th
                                key={column.name}
                                ref={(node) => {
                                    headerRefs.current[columnIndex] = node;
                                }}
                                onContextMenu={(event) =>
                                    onHeaderContextMenu(event, {
                                        columnName: column.name,
                                        columnIndex,
                                    })
                                }
                                className={[
                                    'results-grid__header-cell',
                                    column.isPinned ? 'results-grid__header-cell--pinned' : '',
                                    isPinnedEdge ? 'results-grid__header-cell--pinned-edge' : '',
                                ].filter(Boolean).join(' ')}
                                style={getPinnedStyle(columnIndex, true)}
                            >
                                <div className="results-grid__header-content">
                                    <div className="results-grid__header-title-row">
                                        <span>{column.name}</span>

                                        {isSorted ? (
                                            <Label theme="warning" size="xs">
                                                {sortState?.direction === 'asc' ? 'ASC' : 'DESC'}
                                            </Label>
                                        ) : null}
                                    </div>

                                    {column.native_type ? (
                                        <Text variant="caption-2" color="secondary">
                                            {column.native_type}
                                        </Text>
                                    ) : null}
                                </div>
                            </th>
                        );
                    })}
                </tr>
                </thead>

                <tbody>
                {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="results-grid__row">
                        {row.map((cell, cellIndex) => {
                            const column = columns[cellIndex];
                            const isPinnedEdge = column?.isPinned && cellIndex === lastPinnedColumnIndex;

                            return (
                                <td
                                    key={cellIndex}
                                    onDoubleClick={() => onCellDoubleClick(cell)}
                                    onContextMenu={(event) =>
                                        onCellContextMenu(event, {
                                            cell,
                                            row,
                                            columnName: columns[cellIndex]?.name ?? `column_${cellIndex + 1}`,
                                        })
                                    }
                                    title={t('workspace.doubleClickToCopyCell')}
                                    className={[
                                        'results-grid__cell',
                                        column?.isPinned ? 'results-grid__cell--pinned' : '',
                                        isPinnedEdge ? 'results-grid__cell--pinned-edge' : '',
                                    ].filter(Boolean).join(' ')}
                                    style={getPinnedStyle(cellIndex, false)}
                                >
                                    {cell === null ? (
                                        <Text variant="body-2" color="secondary">
                                            NULL
                                        </Text>
                                    ) : (
                                        String(cell)
                                    )}
                                </td>
                            );
                        })}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
