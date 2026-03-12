import {Button, Label, Text} from "@gravity-ui/uikit";

interface Props {
    rowCount: number;
    durationMs: number;
    sortState: { columnName: string; direction: 'asc' | 'desc' } | null;
    hiddenColumnCount: number;
    activeConnectionName?: string | null;
    activeDatabaseName?: string | null;
    activeTabTitle?: string | null;
    onCopyAll: () => void;
    onResetView: () => void;
    onExportCsv: () => void;
}

export function ResultsToolbar({
                                   rowCount,
                                   durationMs,
                                   sortState,
                                   hiddenColumnCount,
                                   activeConnectionName,
                                   activeDatabaseName,
                                   activeTabTitle,
                                   onCopyAll,
                                   onResetView,
                                   onExportCsv,
                               }: Props) {
    return (
        <div className="results-toolbar">
            <div className="results-toolbar__meta">
                <Text variant="subheader-2">Results</Text>
                <Label theme="success">Success</Label>
                <Label theme="info">{rowCount} rows</Label>
                <Label theme="utility">{durationMs} ms</Label>

                {sortState ? (
                    <Label theme="warning">
                        sorted: {sortState.columnName} {sortState.direction}
                    </Label>
                ) : null}

                {hiddenColumnCount > 0 ? (
                    <Label theme="unknown">
                        hidden: {hiddenColumnCount}
                    </Label>
                ) : null}

                {activeConnectionName ? <Label theme="utility">{activeConnectionName}</Label> : null}
                {activeDatabaseName ? <Label theme="unknown">{activeDatabaseName}</Label> : null}
                {activeTabTitle ? <Label theme="info">{activeTabTitle}</Label> : null}
            </div>

            <div className="results-toolbar__actions">
                <Button size="m" view="outlined" onClick={onCopyAll}>
                    Copy all
                </Button>

                <Button
                    size="m"
                    view="outlined"
                    disabled={hiddenColumnCount === 0 && !sortState}
                    onClick={onResetView}
                >
                    Reset view
                </Button>

                <Button size="m" view="action" onClick={onExportCsv}>
                    Export CSV
                </Button>
            </div>
        </div>
    );
}
