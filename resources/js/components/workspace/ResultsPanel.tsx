import {ExecuteQueryResponse} from "../../types/queryResult";
import {Button, Card, Label, Text} from "@gravity-ui/uikit";
import {useContextMenu} from "../../hooks/useContextMenu";
import {WorkspaceContextMenu} from "./WorkspaceContextMenu";
import {useMemo, useState} from "react";

interface Props {
    result: ExecuteQueryResponse | null;
    activeConnectionName?: string | null;
    activeDatabaseName?: string | null;
    activeTabTitle?: string | null;
}

interface ResultCellPayload {
    cell: unknown;
    row: unknown[];
    columnName: string;
}

interface ResultHeaderPayload {
    columnName: string;
    columnIndex: number;
}

type SortDirection = 'asc' | 'desc';

function escapeCsvValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }

    const stringValue = String(value);

    if (
        stringValue.includes('"') ||
        stringValue.includes(',') ||
        stringValue.includes('\n')
    ) {
        return `"${stringValue.replace(/"/g, '""')}`;
    }

    return stringValue;
}

function buildCsv(
    columns: { name: string; native_type?: string | null }[],
    rows: unknown[][],
): string {
    const header = columns.map((column) => escapeCsvValue(column.name)).join(',');
    const dataRows = rows.map((row) =>
        row.map((cell) => escapeCsvValue(cell)).join(',')
    );

    return [header, ...dataRows].join('\n');
}

function buildTsv(
    columns: { name: string; native_type?: string | null }[],
    rows: unknown[][],
): string {
    const header = columns.map((column) => column.name).join('\t');
    const dataRows = rows.map((row) =>
        row.map((cell) => (cell === null ? 'NULL' : String(cell))).join('\t')
    );

    return [header, ...dataRows].join('\n');
}

function buildRowTsv(row: unknown[]): string {
    return row.map((cell) => (cell === null ? 'NULL' : String(cell))).join('\t');
}

function buildRowJson(row: unknown[], columnNames: string[]): string {
    const payload = Object.fromEntries(
        columnNames.map((columnNames, index) => [columnNames, row[index] ?? null]),
    );

    return JSON.stringify(payload, null, 2);
}

function downloadFile(filename: string, content: string, mimeType: string) {
    const blob = new Blob([content], {type: mimeType});
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

async function copyText(text: string) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (error) {
        console.error(error);
    }
}

function compareValues(a: unknown, b: unknown): number {
    if (a === null && b === null) {
        return 0;
    }

    if (a == null) {
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

export function ResultsPanel({
                                 result,
                                 activeConnectionName,
                                 activeDatabaseName,
                                 activeTabTitle,
                             }: Props) {
    const [hiddenColumnNames, setHiddenColumnNames] = useState<string[]>([]);
    const [sortState, setSortState] = useState<{
        columnName: string;
        direction: SortDirection;
    } | null>(null);

    const {
        state: cellMenuState,
        anchorRef: cellMenuAnchorRef,
        anchorStyle: cellMenuAnchorStyle,
        openContextMenu: openCellContextMenu,
        closeContextMenu: closeCellContextMenu,
    } = useContextMenu<ResultCellPayload>();

    const {
        state: headerMenuState,
        anchorRef: headerMenuAnchorRef,
        anchorStyle: headerMenuAnchorStyle,
        openContextMenu: openHeaderContextMenu,
        closeContextMenu: closeHeaderContextMenu,
    } = useContextMenu<ResultHeaderPayload>();

    const visibleResult = useMemo(() => {
        if (!result || result.status !== 'success') {
            return null;
        }

        const visibleColumns = result.columns
            .map((column, index) => ({...column, originalIndex: index}))
            .filter((column) => !hiddenColumnNames.includes(column.name));

        let nextRows = [...result.rows];

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

    function handleExportCsv() {
        if (!result || result.status !== 'success' || !visibleResult) {
            return;
        }

        const fileBaseName = (activeTabTitle || 'query-results')
            .toLowerCase()
            .replace(/[^a-z0-9-_]+/gi, '-')
            .replace(/^-+|-+$/g, '');

        downloadFile(
            `${fileBaseName || 'query-results'}.csv`,
            buildCsv(visibleResult.visibleColumns, visibleResult.rows),
            'text/csv;charset=utf-8',
        );
    }

    if (!result) {
        return (
            <Card
                view="filled"
                style={{
                    height: '100%',
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    boxSizing: 'border-box',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                    }}
                >
                    <Text variant="subheader-2">Results</Text>

                    <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                        {activeConnectionName ? (
                            <Label theme="utility">{activeConnectionName}</Label>
                        ) : null}

                        {activeDatabaseName ? (
                            <Label theme="unknown">{activeDatabaseName}</Label>
                        ) : null}

                        {activeTabTitle ? (
                            <Label theme="info">{activeTabTitle}</Label>
                        ) : null}
                    </div>
                </div>

                <div style={{marginTop: 8}}>
                    <Text variant="body-2" color="secondary">
                        No results yet.
                    </Text>
                </div>
            </Card>
        );
    }

    if (result.status === 'error') {
        return (
            <Card
                view="filled"
                style={{
                    height: '100%',
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    boxSizing: 'border-box',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                    }}
                >
                    <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                        <Text variant="subheader-2">Results</Text>
                        <Label theme="danger">Error</Label>
                    </div>

                    <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                        {activeConnectionName ? (
                            <Label theme="utility">{activeConnectionName}</Label>
                        ) : null}

                        {activeDatabaseName ? (
                            <Label theme="unknown">{activeDatabaseName}</Label>
                        ) : null}

                        {activeTabTitle ? (
                            <Label theme="info">{activeTabTitle}</Label>
                        ) : null}
                    </div>
                </div>

                <div
                    style={{
                        padding: 12,
                        borderRadius: 10,
                        border: '1px solid var(--g-color-line-danger)',
                        background: 'var(--g-color-base-danger-light)',
                    }}
                >
                    <Text variant="body-2">{result.error}</Text>
                </div>
            </Card>
        );
    }

    const visibleColumns = visibleResult?.visibleColumns ?? [];
    const visibleRows = visibleResult?.rows ?? [];
    const visibleColumnNames = visibleColumns.map((column) => column.name);

    const contextCell = cellMenuState.payload;
    const contextHeader = headerMenuState.payload;

    return (
        <Card
            view="filled"
            style={{
                height: '100%',
                padding: 12,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxSizing: 'border-box',
            }}
        >
            <div ref={cellMenuAnchorRef} style={cellMenuAnchorStyle}/>
            <div ref={headerMenuAnchorRef} style={headerMenuAnchorStyle}/>

            <WorkspaceContextMenu
                open={cellMenuState.open}
                anchorElement={cellMenuAnchorRef.current}
                onClose={closeCellContextMenu}
                actions={
                    contextCell
                        ? [
                            {
                                key: 'copy',
                                text: 'Copy cell',
                                onClick: () =>
                                    copyText(contextCell.cell === null ? 'NULL' : String(contextCell.cell)),
                            },
                            {
                                key: 'copy-row-tsv',
                                text: 'Copy row as TSV',
                                onClick: () => copyText(buildRowTsv(contextCell.row)),
                            },
                            {
                                key: 'copy-row-json',
                                text: 'Copy row as JSON',
                                onClick: () => copyText(buildRowJson(contextCell.row, visibleColumnNames)),
                            },
                            {
                                key: 'separator-1',
                            },
                            {
                                key: 'copy-column',
                                text: 'Copy column name',
                                onClick: () => copyText(contextCell.columnName),
                            },
                        ]
                        : []
                }
            />

            <WorkspaceContextMenu
                open={headerMenuState.open}
                anchorElement={headerMenuAnchorRef.current}
                onClose={closeHeaderContextMenu}
                actions={
                    contextHeader
                        ? [
                            {
                                key: 'sort-asc',
                                text: 'Sort ascending',
                                onClick: () =>
                                    setSortState({
                                        columnName: contextHeader.columnName,
                                        direction: 'asc',
                                    }),
                            },
                            {
                                key: 'sort-desc',
                                text: 'Sort descending',
                                onClick: () =>
                                    setSortState({
                                        columnName: contextHeader.columnName,
                                        direction: 'desc',
                                    }),
                            },
                            {
                                key: 'separator-1',
                            },
                            {
                                key: 'copy-column',
                                text: 'Copy column name',
                                onClick: () => copyText(contextHeader.columnName),
                            },
                            {
                                key: 'separator-2',
                            },
                            {
                                key: 'hide-column',
                                text: 'Hide column',
                                onClick: () =>
                                    setHiddenColumnNames((prev) =>
                                        prev.includes(contextHeader.columnName)
                                            ? prev
                                            : [...prev, contextHeader.columnName],
                                    ),
                            },
                            {
                                key: 'reset-columns',
                                text: 'Reset hidden columns',
                                onClick: () => setHiddenColumnNames([]),
                            },
                            {
                                key: 'reset-sort',
                                text: 'Reset sorting',
                                onClick: () => setSortState(null),
                            },
                        ]
                        : []
                }
            />

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                }}
            >
                <div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
                    <Text variant="subheader-2">Results</Text>
                    <Label theme="success">Success</Label>
                    <Label theme="info">{result.row_count} rows</Label>
                    <Label theme="utility">{result.duration_ms} ms</Label>

                    {sortState ? (
                        <Label theme="warning">
                            sorted: {sortState.columnName} {sortState.direction}
                        </Label>
                    ) : null}

                    {hiddenColumnNames.length > 0 ? (
                        <Label theme="unknown">
                            hidden: {hiddenColumnNames.length}
                        </Label>
                    ) : null}

                    {activeConnectionName ? (
                        <Label theme="utility">{activeConnectionName}</Label>
                    ) : null}

                    {activeDatabaseName ? (
                        <Label theme="unknown">{activeDatabaseName}</Label>
                    ) : null}

                    {activeTabTitle ? (
                        <Label theme="info">{activeTabTitle}</Label>
                    ) : null}
                </div>

                <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                    <Button
                        size="m"
                        view="outlined"
                        onClick={() => {
                            void copyText(buildTsv(visibleColumns, visibleRows));
                        }}
                    >
                        Copy all
                    </Button>

                    <Button
                        size="m"
                        view="outlined"
                        disabled={hiddenColumnNames.length === 0 && !sortState}
                        onClick={() => {
                            setHiddenColumnNames([]);
                            setSortState(null);
                        }}
                    >
                        Reset view
                    </Button>

                    <Button size="m" view="action" onClick={handleExportCsv}>
                        Export CSV
                    </Button>
                </div>
            </div>

            <div
                style={{
                    minHeight: 0,
                    overflow: 'auto',
                    border: '1px solid var(--g-color-line-generic)',
                    borderRadius: 10,
                }}
            >
                <table
                    style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: 14,
                    }}
                >
                    <thead>
                    <tr>
                        {visibleColumns.map((column, columnIndex) => {
                            const isSorted = sortState?.columnName === column.name;

                            return (
                                <th
                                    key={column.name}
                                    onContextMenu={(event) =>
                                        openHeaderContextMenu(event, {
                                            columnName: column.name,
                                            columnIndex,
                                        })
                                }
                                    style={{
                                        textAlign: 'left',
                                        padding: '10px 12px',
                                        borderBottom: '1px solid var(--g-color-line-generic)',
                                        position: 'sticky',
                                        top: 0,
                                        background: 'var(--g-color-base-background)',
                                        zIndex: 1,
                                        whiteSpace: 'nowrap',
                                        cursor: 'context-menu',
                                    }}
                                >
                                    <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
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
                    {visibleRows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                                <td
                                    key={cellIndex}
                                    onDoubleClick={() => {
                                        void copyText(cell === null ? 'NULL' : String(cell));
                                    }}
                                    onContextMenu={(event) =>
                                        openCellContextMenu(event, {
                                            cell,
                                            row,
                                            columnName: visibleColumns[cellIndex]?.name ?? `column_${cellIndex + 1}`,
                                        })
                                    }
                                    title="Double click to copy cell"
                                    style={{
                                        padding: '10px 12px',
                                        borderBottom: '1px solid var(--g-color-line-generic)',
                                        verticalAlign: 'top',
                                        cursor: 'copy',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                    }}
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
        </Card>
    );
}
