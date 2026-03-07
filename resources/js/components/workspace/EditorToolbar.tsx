import {ConnectionDto} from "../../types/connection";
import {Button, Card, Select, Text} from "@gravity-ui/uikit";

interface Props {
    connections: ConnectionDto[];
    activeConnectionId: number | null;
    isExecuting: boolean;
    onSelectConnection: (id: number | null) => void;
    onRun: () => void;
}

export function EditorToolbar({
                                  connections,
                                  activeConnectionId,
                                  isExecuting,
                                  onSelectConnection,
                                  onRun,
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

                <Text variant="body-2" color="secondary">
                    Current connection: {activeConnectionId ?? 'not selected'}
                </Text>
            </div>
        </Card>
    );
}
