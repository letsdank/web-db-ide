import {ConnectionDto} from "../../types/connection";
import {Button, Card, Label, Select, Text} from "@gravity-ui/uikit";

interface Props {
    connections: ConnectionDto[];
    activeConnectionId: number | null;
    isExecuting: boolean;
    hasSelection: boolean;
    onSelectConnection: (id: number | null) => void;
    onRun: () => void;
    onRunSelection: () => void;
}

export function EditorToolbar({
                                  connections,
                                  activeConnectionId,
                                  isExecuting,
                                  hasSelection,
                                  onSelectConnection,
                                  onRun,
                                  onRunSelection,
                              }: Props) {
    const selectValue = activeConnectionId ? [String(activeConnectionId)] : [];

    return (
        <Card
            view="filled"
            style={{
                padding: 10,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                }}
            >
                <Button
                    view="action"
                    size="l"
                    onClick={onRun}
                    disabled={!activeConnectionId || isExecuting}
                >
                    {isExecuting ? 'Running...' : 'Run'}
                </Button>

                <Button
                    view="outlined"
                    size="l"
                    onClick={onRunSelection}
                    disabled={!activeConnectionId || isExecuting || !hasSelection}
                >
                    Run selection
                </Button>

                <div style={{minWidth: 260}}>
                    <Select
                        width="max"
                        placeholder="Select connection"
                        value={selectValue}
                        onUpdate={(value) => {
                            const first = value[0];
                            onSelectConnection(first ? Number(first) : null);
                        }}
                        options={connections.map((connection) => ({
                            value: String(connection.id),
                            content: `${connection.name} (${connection.driver})`,
                        }))}
                    />
                </div>

                {hasSelection ? (
                    <Label theme="info">Selection active</Label>
                ) : (
                    <Label theme="utility">Full query mode</Label>
                )}

                <Text variant="body-2" color="secondary">
                    Ctrl/Cmd + Enter &mdash; execute current selection or full query
                </Text>
            </div>
        </Card>
    );
}
