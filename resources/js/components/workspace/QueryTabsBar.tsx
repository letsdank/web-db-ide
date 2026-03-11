import {QueryTabDto} from "../../types/queryTab";
import {Button, Card, Label, Text} from "@gravity-ui/uikit";

interface Props {
    tabs: QueryTabDto[];
    activeTabId: number | null;
    dirtyTabIds: number[];
    onSelect: (id: number) => void;
    onCreate: () => void;
    onClose: (id: number) => void;
    onTogglePin: (tab: QueryTabDto) => void;
}

export function QueryTabsBar({
                                 tabs,
                                 activeTabId,
                                 dirtyTabIds,
                                 onSelect,
                                 onCreate,
                                 onClose,
                                 onTogglePin,
                             }: Props) {
    return (
        <Card view="filled" style={{padding: 10}}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minWidth: 0,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        gap: 8,
                        overflowX: 'auto',
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    {tabs.map((tab) => {
                        const isActive = tab.id === activeTabId;
                        const isDirty = dirtyTabIds.includes(tab.id);
                        const isPinned = Boolean(tab.is_pinned);

                        return (
                            <div
                                key={tab.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    minWidth: 0,
                                    padding: '8px 10px',
                                    borderRadius: 10,
                                    border: isActive
                                        ? '1px solid var(--g-color-line-brand)'
                                        : '1px solid var(--g-color-line-generic)',
                                    background: isActive
                                        ? 'var(--g-color-base-selection)'
                                        : 'var(--g-color-base-float)',
                                }}
                            >
                                <button
                                    onClick={() => onSelect(tab.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        border: 'none',
                                        background: 'transparent',
                                        padding: 0,
                                        cursor: 'pointer',
                                        minWidth: 0,
                                        color: 'inherit',
                                    }}
                                >
                                    <Text variant="body-2" style={{whiteSpace: 'nowrap'}}>
                                        {tab.title || 'New Query'}
                                    </Text>

                                    {isDirty ? (
                                        <span
                                            style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: 999,
                                                background: 'var(--g-color-text-brand)',
                                                display: 'inline-block',
                                                flexShrink: 0,
                                            }}
                                        />
                                    ) : null}
                                </button>

                                {isPinned ? (
                                    <Label theme="info">Pinned</Label>
                                ) : null}

                                <Button
                                    size="s"
                                    view="flat"
                                    onClick={() => onTogglePin(tab)}
                                >
                                    {isPinned ? 'Unpin' : 'Pin'}
                                </Button>

                                {!isPinned ? (
                                    <Button
                                        size="s"
                                        view="flat-secondary"
                                        onClick={() => onClose(tab.id)}
                                    >
                                        ×
                                    </Button>
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                <Button view="action" onClick={onCreate}>
                    New tab
                </Button>
            </div>
        </Card>
    );
}
