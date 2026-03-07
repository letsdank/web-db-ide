import {QueryTabDto} from "../../types/queryTab";
import {Button, Card, Text} from "@gravity-ui/uikit";

interface Props {
    tabs: QueryTabDto[];
    activeTabId: number | null;
    onSelect: (id: number) => void;
    onCreate: () => void;
}

export function QueryTabsBar({tabs, activeTabId, onSelect, onCreate}: Props) {
    return (
        <Card
            view="filled"
            style={{
                padding: 8,
                minHeight: 64,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    overflowX: 'auto',
                }}
            >
                {tabs.map((tab) => {
                    const active = tab.id === activeTabId;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onSelect(tab.id)}
                            style={{
                                border: '1px solid var(--g-color-line-generic)',
                                background: active
                                    ? 'var(--g-color-base-selection)'
                                    : 'var(--g-color-base-float)',
                                color: 'inherit',
                                borderRadius: 10,
                                padding: '10px 14px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}
                        >
                            <Text variant="body-2">{tab.title || 'New Query'}</Text>
                        </button>
                    );
                })}

                <Button view="action" size="m" onClick={onCreate}>
                    New tab
                </Button>
            </div>
        </Card>
    );
}
