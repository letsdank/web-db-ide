import type {ExecuteQueryResponse} from "../../../types/queryResult";
import {useResultView} from "../hooks/useResultView";
import {useContextMenu} from "../../../hooks/useContextMenu";
import {ResultsEmptyState} from "./ResultsEmptyState";
import {ResultsErrorState} from "./ResultsErrorState";
import {
    buildCsv,
    buildExportFileName,
    buildRowJson,
    buildRowTsv,
    buildTsv,
    copyText,
    downloadFile
} from "../utils/resultExport";
import {Card} from "@gravity-ui/uikit";
import {WorkspaceContextMenu} from "../../../components/workspace/WorkspaceContextMenu";
import {ResultsToolbar} from "./ResultsToolbar";
import {ResultsGrid} from "./ResultsGrid";
import {useI18n} from "../../../i18n";

interface Props {
    result: ExecuteQueryResponse | null;
    activeConnectionName?: string | null;
    activeDatabaseName?: string | null;
    activeTabTitle?: string | null;
    resultLimit: 100 | 500 | 1000;
    onChangeResultLimit: (limit: 100 | 500 | 1000) => void;
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

export function ResultsPanel({
                                 result,
                                 activeConnectionName,
                                 activeDatabaseName,
                                 activeTabTitle,
                                 resultLimit,
                                 onChangeResultLimit,
                             }: Props) {
    const {t} = useI18n();

    const {
        hiddenColumnNames,
        sortState,
        filterValue,
        visibleResult,
        setFilterValue,
        setSortState,
        hideColumn,
        resetColumns,
        resetSorting,
        resetView,
    } = useResultView(result);

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

    if (!result) {
        return (
            <ResultsEmptyState
                activeConnectionName={activeConnectionName}
                activeDatabaseName={activeDatabaseName}
                activeTabTitle={activeTabTitle}
            />
        );
    }

    if (result.status === 'error') {
        return (
            <ResultsErrorState
                error={result.error}
                activeConnectionName={activeConnectionName}
                activeDatabaseName={activeDatabaseName}
                activeTabTitle={activeTabTitle}
            />
        );
    }

    const visibleColumns = visibleResult?.visibleColumns ?? [];
    const visibleRows = visibleResult?.rows ?? [];
    const filteredRowCount = visibleResult?.filteredRowCount ?? 0;
    const visibleColumnNames = visibleColumns.map((column) => column.name);

    const contextCell = cellMenuState.payload;
    const contextHeader = headerMenuState.payload;

    function handleExportCsv() {
        downloadFile(buildExportFileName(activeTabTitle, 'csv'), buildCsv(visibleColumns, visibleRows), 'text/csv;charset=utf-8;');
    }

    function handleExportJson() {
        const rows = visibleRows.map((row) =>
            Object.fromEntries(visibleColumns.map((col, i) => [col.name, row[i] ?? null])),
        );

        downloadFile(buildExportFileName(activeTabTitle, 'json'), JSON.stringify(rows, null, 2), 'application/json');
    }

    function handleExportTsv() {
        downloadFile(buildExportFileName(activeTabTitle, 'tsv'), buildTsv(visibleColumns, visibleRows), 'text/tab-separated-values');
    }

    return (
        <Card
            view="filled"
            className="workspace-card workspace-card--hidden results-panel"
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
                                text: t('workspace.copyCell'),
                                onClick: () =>
                                    void copyText(contextCell.cell === null ? 'NULL' : String(contextCell.cell)),
                            },
                            {
                                key: 'copy-row-tsv',
                                text: t('workspace.copyRowAsTsv'),
                                onClick: () =>
                                    void copyText(buildRowTsv(contextCell.row)),
                            },
                            {
                                key: 'copy-row-json',
                                text: t('workspace.copyRowAsJson'),
                                onClick: () =>
                                    void copyText(buildRowJson(contextCell.row, visibleColumnNames)),
                            },
                            {
                                key: 'separator-1',
                            },
                            {
                                key: 'copy-column',
                                text: t('workspace.copyColumnName'),
                                onClick: () =>
                                    void copyText(contextCell.columnName),
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
                                text: t('workspace.sortAscending'),
                                onClick: () =>
                                    setSortState({
                                        columnName: contextHeader.columnName,
                                        direction: 'asc',
                                    }),
                            },
                            {
                                key: 'sort-desc',
                                text: t('workspace.sortDescending'),
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
                                text: t('workspace.copyColumnName'),
                                onClick: () =>
                                    void copyText(contextHeader.columnName),
                            },
                            {
                                key: 'separator-2',
                            },
                            {
                                key: 'hide-column',
                                text: t('workspace.hideColumn'),
                                onClick: () => hideColumn(contextHeader.columnName),
                            },
                            {
                                key: 'reset-columns',
                                text: t('workspace.resetHiddenColumns'),
                                onClick: resetColumns,
                            },
                            {
                                key: 'reset-sort',
                                text: t('workspace.resetSorting'),
                                onClick: resetSorting,
                            },
                        ]
                        : []
                }
            />

            <ResultsToolbar
                rowCount={result.row_count}
                visibleRowCount={filteredRowCount}
                hasMore={result.has_more}
                durationMs={result.duration_ms}
                resultLimit={resultLimit}
                sortState={sortState}
                hiddenColumnCount={hiddenColumnNames.length}
                filterValue={filterValue}
                onFilterChange={setFilterValue}
                onCopyAll={() => {
                    void copyText(buildTsv(visibleColumns, visibleRows));
                }}
                onResetView={resetView}
                onExportCsv={handleExportCsv}
                onExportJson={handleExportJson}
                onExportTsv={handleExportTsv}
                onChangeResultLimit={onChangeResultLimit}
            />

            <ResultsGrid
                columns={visibleColumns}
                rows={visibleRows}
                sortState={sortState}
                onHeaderContextMenu={openHeaderContextMenu}
                onCellContextMenu={openCellContextMenu}
                onCellDoubleClick={(cell) => {
                    void copyText(cell === null ? 'NULL' : String(cell))
                }}
            />
        </Card>
    );
}
