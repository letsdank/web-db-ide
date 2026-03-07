import {ConnectionDto} from "../../types/connection";
import {Button, Card, Text} from "@gravity-ui/uikit";

interface Props {
    connections: ConnectionDto[];
    activeConnectionId: number | null;
    onSelect: (id: number) => void;
    onCreateClick: () => void;
}

export function ConnectionsSidebar({
                                       connections,
                                       activeConnectionId,
                                       onSelect,
                                       onCreateClick,
                                   }: Props) {
    return (
        <Card
            view="filled"
            style={{
                height: '100%',
                padding: 12,
                overflow: 'auto',
                boxSizing: 'border-box',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 12,
                }}
            >
                <Text variant="header-1">Connections</Text>

                <Button view="action" size="m" onClick={onCreateClick}>
                    New
                </Button>
            </div>

            <div style={{display: 'grid', gap: 8}}>
                {connections.map((connection) => {
                    const active = connection.id === activeConnectionId;

                    return (
                        <button
                            key={connection.id}
                            onClick={() => onSelect(connection.id)}
                            style={{
                                textAlign: 'left',
                                border: '1px solid var(--g-color-line-generic)',
                                background: active
                                    ? 'var(--g-color-base-selection)'
                                    : 'var(--g-color-base-float)',
                                borderRadius: 10,
                                padding: 12,
                                cursor: 'pointer',
                                color: 'inherit',
                            }}
                        >
                            <div style={{marginBottom: 4}}>
                                <Text variant="subheader-2">{connection.name}</Text>
                            </div>

                            <Text variant="body-1" color="secondary">
                                {connection.driver} · {connection.host}:{connection.port}
                            </Text>

                            <div style={{marginTop: 2}}>
                                <Text variant="body-1" color="secondary">
                                    {connection.database_name}
                                </Text>
                            </div>
                        </button>
                    );
                })}
            </div>
        </Card>
    );
}
