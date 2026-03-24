import React from "react";
import {Label, Text} from "@gravity-ui/uikit";
import {useI18n} from "../../../i18n";

interface VisibleColumn {
    name: string;
    native_type?: string | null;
    originalIndex: number;
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
    const{t}=useI18n();

    if(rows.length===0){
        return(
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

                        return (
                            <th
                                key={column.name}
                                onContextMenu={(event) =>
                                    onHeaderContextMenu(event, {
                                        columnName: column.name,
                                        columnIndex,
                                    })
                                }
                                className="results-grid__header-cell"
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
                    <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
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
                                className="results-grid__cell"
                            >
                                {cell === null ? (
                                    <Text variant="body-2" color="secondary">
                                        NULL
                                    </Text>
                                ) : (
                                    String(cell)
                                )}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
