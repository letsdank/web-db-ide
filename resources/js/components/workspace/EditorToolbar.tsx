import {ConnectionDto} from "../../types/connection";
import {Button, Card, Hotkey, Label, Select, Text} from "@gravity-ui/uikit";

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
                padding: 12,
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
                    loading={isExecuting}
                >
                    Run all
                </Button>

                <Button
                    view="outlined"
                    size="l"
                    onClick={onRunSelection}
                    disabled={!activeConnectionId || isExecuting || !hasSelection}
                >
                    Run selection
                </Button>

                <div style={{minWidth: 320, flex: "0 1 420px"}}>
                    <Select
                        width="max"
                        size="l"
                        filterable
                        hasClear
                        placeholder="Select connection"
                        value={selectValue}
                        onUpdate={(value) => {
                            const first = value[0];
                            onSelectConnection(first ? Number(first) : null);
                        }}
                        options={connections.map((connection) => ({
                            value: String(connection.id),
                            content: `${connection.name} · (${connection.driver})`,
                        }))}
                    />
                </div>

                {hasSelection ? (
                    <Label theme="info">Selection available</Label>
                ) : (
                    <Label theme="utility">No selection</Label>
                )}

                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        marginLeft: "auto",
                        flexWrap: "wrap",
                    }}
                >
                    <Text variant="body-2" color="secondary">
                        Run all
                    </Text>
                    <Hotkey value="mod+enter" view="dark"/>

                    {hasSelection ? (
                        <>
                            <Text variant="body-2" color="secondary">
                                Run selection
                            </Text>
                            <Hotkey value="shift+mod+enter" view="dark"/>
                        </>
                    ) : null}
                </div>
            </div>
        </Card>
    );
}
