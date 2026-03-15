import {WorkspaceRightPanel} from "../../stores/workspaceStore";
import {QueryHistoryDto} from "../../types/queryHistory";
import {SavedQueryDto} from "../../types/savedQuery";
import {Button, Card, Label, SegmentedRadioGroup, Text} from "@gravity-ui/uikit";

interface Props {
    panel: WorkspaceRightPanel;
    history: QueryHistoryDto[];
    savedQueries: SavedQueryDto[];
    onChangePanel: (panel: WorkspaceRightPanel) => void;
    onOpenHistoryItem: (item: QueryHistoryDto) => void;
    onOpenSavedQuery: (item: SavedQueryDto) => void;
    onSaveCurrentQuery: () => void;
}

export function RightSidebarPanels({
                                       panel,
                                       history,
                                       savedQueries,
                                       onChangePanel,
                                       onOpenHistoryItem,
                                       onOpenSavedQuery,
                                       onSaveCurrentQuery,
                                   }: Props) {
    return (
        <Card view="filled" className="right-sidebar-panels__card">
            <div className="right-sidebar-panels__layout">
                <div className="right-sidebar-panels__header">
                    <div className="right-sidebar-panels__title-row">
                        <Text variant="header-1">Workspace</Text>

                        <Button view="outlined" size="m" onClick={onSaveCurrentQuery}>
                            Save query
                        </Button>
                    </div>

                    <SegmentedRadioGroup
                        size="m"
                        value={panel}
                        options={[
                            {value: 'history', content: 'History'},
                            {value: 'saved', content: 'Saved'},
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
                                        {item.sql_text.slice(0, 140) || 'Empty query'}
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
                                No history yet.
                            </Text>
                        )
                    ) : savedQueries.length > 0 ? (
                        savedQueries.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onOpenSavedQuery(item)}
                                className="right-sidebar-panels__item"
                            >
                                <div className="right-sidebar-panels__item-meta">
                                    <Text variant="subheader-2">{item.title}</Text>

                                    {item.folder ? (
                                        <Label theme="unknown">{item.folder}</Label>
                                    ) : null}
                                </div>

                                {item.connection ? (
                                    <div className="right-sidebar-panels__item-subtitle">
                                        <Text variant="caption-2" color="secondary">
                                            {item.connection.name} · {item.connection.database_name}
                                        </Text>
                                    </div>
                                ) : null}

                                <Text variant="body-2">
                                    {item.sql_text.slice(0, 140) || 'Empty query'}
                                </Text>
                            </button>
                        ))
                    ) : (
                        <Text variant="body-2" color="secondary">
                            No saved queries yet.
                        </Text>
                    )}
                </div>
            </div>
        </Card>
    );
}
