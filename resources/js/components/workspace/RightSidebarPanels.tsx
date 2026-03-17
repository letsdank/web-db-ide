import {WorkspaceRightPanel} from "../../stores/workspaceStore";
import {QueryHistoryDto} from "../../types/queryHistory";
import {SavedQueryDto} from "../../types/savedQuery";
import {Button, Card, Label, SegmentedRadioGroup, Text} from "@gravity-ui/uikit";
import {useI18n} from "../../i18n";
import {getResourceMarker} from "../../lib/resourceMarkers";

interface Props {
    panel: WorkspaceRightPanel;
    history: QueryHistoryDto[];
    savedQueries: SavedQueryDto[];
    canSaveCurrentQuery: boolean;
    onChangePanel: (panel: WorkspaceRightPanel) => void;
    onOpenHistoryItem: (item: QueryHistoryDto) => void;
    onOpenSavedQuery: (item: SavedQueryDto) => void;
    onOpenSaveQueryDialog: () => void;
}

export function RightSidebarPanels({
                                       panel,
                                       history,
                                       savedQueries,
                                       canSaveCurrentQuery,
                                       onChangePanel,
                                       onOpenHistoryItem,
                                       onOpenSavedQuery,
                                       onOpenSaveQueryDialog,
                                   }: Props) {
    const {t} = useI18n();

    return (
        <Card view="filled" className="right-sidebar-panels__card">
            <div className="right-sidebar-panels__layout">
                <div className="right-sidebar-panels__header">
                    <div className="right-sidebar-panels__title-row">
                        <Text variant="header-1">{t('workspace.workspace')}</Text>

                        <Button
                            view="outlined"
                            size="m"
                            disabled={!canSaveCurrentQuery}
                            onClick={onOpenSaveQueryDialog}
                        >
                            {t('workspace.saveQuery')}
                        </Button>
                    </div>

                    <SegmentedRadioGroup
                        size="m"
                        value={panel}
                        options={[
                            {value: 'history', content: t('workspace.history')},
                            {value: 'saved', content: t('workspace.saved')},
                        ]}
                        onUpdate={(value) => onChangePanel(value as WorkspaceRightPanel)}
                    />
                </div>

                <div className="right-sidebar-panels__content">
                    {panel === 'history' ? (
                        history.length > 0 ? (
                            history.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onOpenHistoryItem(item)}
                                    className="right-sidebar-panels__item"
                                >
                                    <div className="right-sidebar-panels__item-meta">
                                        <Label theme={item.status === 'success' ? 'success' : 'danger'}>
                                            {item.status}
                                        </Label>

                                        {item.duration_ms !== null ? (
                                            <Label theme="utility">{item.duration_ms} ms</Label>
                                        ) : null}

                                        {item.row_count !== null ? (
                                            <Label theme="info">{item.row_count} rows</Label>
                                        ) : null}
                                    </div>

                                    <Text variant="body-2" className="right-sidebar-panels__item-text">
                                        {item.sql_text.slice(0, 140) || t('workspace.emptyQuery')}
                                    </Text>

                                    <div className="right-sidebar-panels__item-footer">
                                        <Text variant="caption-2" color="secondary">
                                            {new Date(item.executed_at).toLocaleString()}
                                        </Text>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <Text variant="body-2" color="secondary">
                                {t('workspace.noHistory')}
                            </Text>
                        )
                    ) : savedQueries.length > 0 ? (
                        savedQueries.map((item) => {
                            const marker = getResourceMarker(item.visibility);

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onOpenSavedQuery(item)}
                                    className="right-sidebar-panels__item"
                                >
                                    <div className="right-sidebar-panels__item-meta">
                                        <Text variant="subheader-2">{item.title}</Text>

                                        <div className="right-sidebar-panels__item-meta">
                                            <Label theme={marker.theme}>
                                                {marker.kind === 'shared'
                                                    ? t('workspace.sharedMarker')
                                                    : t('workspace.ownedMarker')}
                                            </Label>

                                            {item.folder ? (
                                                <Label theme="unknown">{item.folder}</Label>
                                            ) : null}
                                        </div>
                                    </div>

                                    {item.connection ? (
                                        <div className="right-sidebar-panels__item-subtitle">
                                            <Text variant="caption-2" color="secondary">
                                                {item.connection.name} · {item.connection.database_name}
                                            </Text>
                                        </div>
                                    ) : null}

                                    <Text variant="body-2">
                                        {item.sql_text.slice(0, 140) || t('workspace.emptyQuery')}
                                    </Text>
                                </button>
                            )
                        })
                    ) : (
                        <Text variant="body-2" color="secondary">
                            {t('workspace.noSavedQueries')}
                        </Text>
                    )}
                </div>
            </div>
        </Card>
    );
}
