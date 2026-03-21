import {Button, DropdownMenu, Icon, Label, Text} from "@gravity-ui/uikit";
import {ChevronDown} from "@gravity-ui/icons";

interface Props {
    rowCount: number;
    hasMore: boolean;
    durationMs: number;
    resultLimit: 100 | 500 | 1000;
    sortState: { columnName: string; direction: 'asc' | 'desc' } | null;
    hiddenColumnCount: number;
    activeConnectionName?: string | null;
    activeDatabaseName?: string | null;
    activeTabTitle?: string | null;
    onCopyAll: () => void;
    onResetView: () => void;
    onExportCsv: () => void;
    onExportJson: () => void;
    onExportTsv: () => void;
    onChangeResultLimit: (limit: 100 | 500 | 1000) => void;
}

export function ResultsToolbar({
                                   rowCount,
                                   hasMore,
                                   durationMs,
                                   resultLimit,
                                   sortState,
                                   hiddenColumnCount,
                                   activeConnectionName,
                                   activeDatabaseName,
                                   activeTabTitle,
                                   onCopyAll,
                                   onResetView,
                                   onExportCsv,
                                   onExportJson,
                                   onExportTsv,
                                   onChangeResultLimit,
                               }: Props) {
    return (
        <div className="results-toolbar">
            <div className="results-toolbar__meta">
                <Text variant="subheader-2">Results</Text>
                <Label theme="success">Success</Label>
                <Label theme="info">
                    {hasMore ? `${rowCount}+ rows` : `${rowCount} rows`}
                </Label>
                <Label theme="utility">{durationMs} ms</Label>

                {sortState ? (
                    <Text variant="body-1" color="secondary">
                        sorted: {sortState.columnName} {sortState.direction}
                    </Text>
                ) : null}

                {hiddenColumnCount > 0 ? (
                    <Text variant="body-1" color="secondary">
                        hidden: {hiddenColumnCount}
                    </Text>
                ) : null}

                {activeConnectionName ? (
                    <Text variant="body-1" color="secondary">
                        {activeConnectionName}
                    </Text>
                ) : null}

                {activeDatabaseName ? (
                    <Text variant="body-1" color="secondary">
                        {activeDatabaseName}
                    </Text>
                ) : null}

                {activeTabTitle ? (
                    <Text variant="body-1" color="secondary">
                        {activeTabTitle}
                    </Text>
                ) : null}
            </div>

            <div className="results-toolbar__actions">
                <DropdownMenu
                    items={[
                        {
                            text: '100 rows',
                            action: () => onChangeResultLimit(100),
                        },
                        {
                            text: '500 rows',
                            action: () => onChangeResultLimit(500),
                        },
                        {
                            text: '1000 rows',
                            action: () => onChangeResultLimit(1000),
                        },
                    ]}
                    renderSwitcher={(props) => (
                        <Button {...props} view="flat-secondary">
                            Limit: {resultLimit}
                        </Button>
                    )}
                />

                <Button view="flat-secondary" onClick={onCopyAll}>
                    Copy all
                </Button>

                <Button view="flat-secondary" onClick={onResetView}>
                    Reset view
                </Button>

                <DropdownMenu
                    items={[
                        {text: 'CSV', action: onExportCsv},
                        {text: 'JSON', action: onExportJson},
                        {text: 'TSV', action: onExportTsv},
                    ]}
                    renderSwitcher={(props) => (
                        <Button {...props} view="flat-secondary">
                            Export
                            <Icon data={ChevronDown} size={14}/>
                        </Button>
                    )}
                />
            </div>
        </div>
    );
}
