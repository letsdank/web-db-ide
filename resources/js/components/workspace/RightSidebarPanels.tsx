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
        <Card
            view="filled"
            style={{
                height: '100%',
                padding: 12,
                overflow: 'hidden',
                boxSizing: 'border-box',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    height: '100%',
                    minHeight: 0,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                        }}
                    >
                        <Text variant="header-1">Workspace</Text>

                        <Button view="outlined" size="m" onClick={onSaveCurrentQuery}>
                            Save query
                        </Button>
                    </div>

                    <SegmentedRadioGroup
                        size="m"
                        value={panel}
                        options={[
                            {value: 'History', content: 'History'},
                            {value: 'saved', content: 'Saved'},
                        ]}
                        onUpdate={(value) => onChangePanel(value as WorkspaceRightPanel)}
                    />
                </div>

                <div
                    style={{
                        minHeight: 0,
                        overflow: 'auto',
                        display: 'grid',
                        gap: 8,
                    }}
                >
                    {panel === 'history' ? (
                        history.length > 0 ? (
                            history.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onOpenHistoryItem(item)}
                                    style={{
                                        textAlign: 'left',
                                        border: '1px solid var(--g-color-line-generic)',
                                        background: 'var(--g-color-base-float)',
                                        borderRadius: 10,
                                        padding: 12,
                                        cursor: 'pointer',
                                        color: 'inherit',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            marginBottom: 8,
                                            flexWrap: 'wrap',
                                        }}
                                    >
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

                                    <Text variant="body-2" style={{display: 'block'}}>
                                        {item.sql_text.slice(0, 140) || 'Empty query'}
                                    </Text>

                                    <div style={{marginTop: 6}}>
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
                                style={{
                                    textAlign: 'left',
                                    border: '1px solid var(--g-color-line-generic)',
                                    background: 'var(--g-color-base-float)',
                                    borderRadius: 10,
                                    padding: 12,
                                    cursor: 'pointer',
                                    color: 'inherit',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        marginBottom: 8,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <Text variant="subheader-2">{item.title}</Text>

                                    {item.folder ? (
                                        <Label theme="unknown">{item.folder}</Label>
                                    ) : null}
                                </div>

                                {item.connection ? (
                                    <div style={{marginBottom: 6}}>
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
