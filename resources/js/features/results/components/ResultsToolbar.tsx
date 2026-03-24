import {Button, DropdownMenu, Icon, Label, Text, TextInput} from "@gravity-ui/uikit";
import {ChevronDown, Magnifier} from "@gravity-ui/icons";
import {useI18n} from "../../../i18n";

interface Props {
    rowCount: number;
    visibleRowCount: number;
    hasMore: boolean;
    durationMs: number;
    resultLimit: 100 | 500 | 1000;
    sortState: { columnName: string; direction: 'asc' | 'desc' } | null;
    hiddenColumnCount: number;
    filterValue: string;
    activeConnectionName?: string | null;
    activeDatabaseName?: string | null;
    activeTabTitle?: string | null;
    onFilterChange: (value: string) => void;
    onCopyAll: () => void;
    onResetView: () => void;
    onExportCsv: () => void;
    onExportJson: () => void;
    onExportTsv: () => void;
    onChangeResultLimit: (limit: 100 | 500 | 1000) => void;
}

export function ResultsToolbar({
                                   rowCount,
                                   visibleRowCount,
                                   hasMore,
                                   durationMs,
                                   resultLimit,
                                   sortState,
                                   hiddenColumnCount,
                                   filterValue,
                                   onFilterChange,
                                   onCopyAll,
                                   onResetView,
                                   onExportCsv,
                                   onExportJson,
                                   onExportTsv,
                                   onChangeResultLimit,
                               }: Props) {
    const {t} = useI18n();
    const hasFilter = filterValue.trim().length > 0;

    return (
        <div className="results-toolbar">
            <div className="results-toolbar__meta">
                <Text variant="subheader-2">{t('workspace.results')}</Text>
                <Label theme="success">{t('workspace.success')}</Label>
                <Label theme="info">
                    {hasMore ? `${rowCount}+ ${t('workspace.rowsLabel')}` : `${rowCount} ${t('workspace.rowsLabel')}`}
                </Label>
                <Label theme="utility">{durationMs} ms</Label>

                {hasFilter ? (
                    <Label theme="warning">
                        {t('workspace.filtered')}: {visibleRowCount}
                    </Label>
                ) : null}

                {sortState ? (
                    <Text variant="body-1" color="secondary">
                        {t('workspace.sortedBy', {
                            column: sortState.columnName,
                            direction: sortState.direction,
                        })}
                    </Text>
                ) : null}

                {hiddenColumnCount > 0 ? (
                    <Text variant="body-1" color="secondary">
                        {t('workspace.hiddenColumnsCount', {count: hiddenColumnCount})}
                    </Text>
                ) : null}
            </div>

            <div className="results-toolbar__actions">
                <div className="results-toolbar__search">
                    <TextInput
                        value={filterValue}
                        size="m"
                        placeholder={t('workspace.resultsFilterPlaceholder')}
                        onUpdate={onFilterChange}
                        startContent={<Icon data={Magnifier} size={16}/>}
                    />
                    <Text variant="caption-2" color="secondary">
                        {t('workspace.resultsFilterHint')}
                    </Text>
                </div>

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
                            {t('workspace.limit')}: {resultLimit}
                        </Button>
                    )}
                />

                <Button view="flat-secondary" onClick={onCopyAll}>
                    {t('workspace.copyAll')}
                </Button>

                <Button view="flat-secondary" onClick={onResetView}>
                    {t('workspace.resetView')}
                </Button>

                <DropdownMenu
                    items={[
                        {text: 'CSV', action: onExportCsv},
                        {text: 'JSON', action: onExportJson},
                        {text: 'TSV', action: onExportTsv},
                    ]}
                    renderSwitcher={(props) => (
                        <Button {...props} view="flat-secondary">
                            {t('workspace.export')}
                            <Icon data={ChevronDown} size={14}/>
                        </Button>
                    )}
                />
            </div>
        </div>
    );
}
