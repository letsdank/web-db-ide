import {CommandPaletteItem} from "../../types/commandPalette";
import {useEffect, useMemo, useState} from "react";
import {Button, Card, Label, Text, TextInput} from "@gravity-ui/uikit";

interface Props {
    open: boolean;
    items: CommandPaletteItem[];
    onClose: () => void;
}

const KIND_LABELS: Record<CommandPaletteItem['kind'], string> = {
    action: 'Actions',
    tab: 'Tabs',
    connection: 'Connections',
    'saved-query': 'Saved queries',
};

function matches(item: CommandPaletteItem, query: string): boolean {
    const haystack = [
        item.title,
        item.subtitle ?? '',
        ...(item.keywords ?? []),
        item.kind,
    ]
        .join(' ')
        .toLowerCase();

    return haystack.includes(query.toLowerCase());
}

export function CommandPalette({
                                   open,
                                   items,
                                   onClose,
                               }: Props) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        if (!open) {
            setQuery('');
            setSelectedIndex(0);
        }
    }, [open]);

    const filteredItems = useMemo(() => {
        if (!query.trim()) {
            return items;
        }

        return items.filter((item) => matches(item, query.trim()));
    }, [items, query]);

    const groupedItems = useMemo(() => {
        const groups: Record<string, CommandPaletteItem[]> = {};

        for (const item of filteredItems) {
            if (!groups[item.kind]) {
                groups[item.kind] = [];
            }

            groups[item.kind].push(item);
        }

        return groups;
    }, [filteredItems]);

    useEffect(() => {
        if (selectedIndex >= filteredItems.length) {
            setSelectedIndex(0);
        }
    }, [filteredItems.length, selectedIndex]);

    useEffect(() => {
        if (!open) {
            return;
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setSelectedIndex((prev) =>
                    filteredItems.length === 0 ? 0 : (prev + 1) % filteredItems.length,
                );
                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setSelectedIndex((prev) =>
                    filteredItems.length === 0
                        ? 0
                        : (prev - 1 + filteredItems.length) % filteredItems.length,
                );
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                const item = filteredItems[selectedIndex];

                if (item) {
                    void Promise.resolve(item.onSelect()).finally(() => {
                        onClose();
                    });
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [filteredItems, onClose, open, selectedIndex]);

    if (!open) {
        return null;
    }

    let flatIndex = -1;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.48)',
                zIndex: 3000,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: 72,
                paddingLeft: 16,
                paddingRight: 16,
                boxSizing: 'border-box',
            }}
        >
            <Card
                view="filled"
                onClick={(event) => event.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: 760,
                    maxHeight: '75vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    borderRadius: 16,
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
                    background: 'var(--g-color-base-modal)',
                }}
            >
                <div
                    style={{
                        padding: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        borderBottom: '1px solid var(--g-color-line-generic)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                        }}
                    >
                        <Text variant="header-1">Command Palette</Text>

                        <Label theme="utility">Ctrl/Cmd + K</Label>
                    </div>

                    <TextInput
                        size="xl"
                        value={query}
                        placeholder="Search actions, tabs, connections, saved queries..."
                        autoFocus
                        onUpdate={setQuery}
                    />
                </div>

                <div
                    style={{
                        minHeight: 0,
                        overflow: 'auto',
                        padding: 8,
                        display: 'grid',
                        gap: 8,
                    }}
                >
                    {filteredItems.length > 0 ? (
                        Object.entries(groupedItems).map(([kind, group]) => (
                            <div key={kind} style={{display: 'grid', gap: 6}}>
                                <div style={{padding: '4px 8px'}}>
                                    <Text variant="caption-2" color="secondary">
                                        {KIND_LABELS[kind as CommandPaletteItem['kind']]}
                                    </Text>
                                </div>

                                {group.map((item) => {
                                    flatIndex += 1;
                                    const isSelected = flatIndex === selectedIndex;

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                void Promise.resolve(item.onSelect()).finally(() => {
                                                    onClose();
                                                });
                                            }}
                                            style={{
                                                width: '100%',
                                                border: 'none',
                                                background: isSelected
                                                    ? 'var(--g-color-base-selection)'
                                                    : 'transparent',
                                                color: 'inherit',
                                                textAlign: 'left',
                                                padding: 12,
                                                borderRadius: 12,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 12,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    minWidth: 0,
                                                }}
                                            >
                                                {item.icon ? (
                                                    <div
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            display: 'grid',
                                                            placeItems: 'center',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {item.icon}
                                                    </div>
                                                ) : null}

                                                <div style={{minWidth: 0}}>
                                                    <Text variant="body-2" style={{display: 'block'}}>
                                                        {item.title}
                                                    </Text>

                                                    {item.subtitle ? (
                                                        <Text
                                                            variant="caption-2"
                                                            color="secondary"
                                                            style={{display: 'block', marginTop: 2}}
                                                        >
                                                            {item.subtitle}
                                                        </Text>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <Label theme="unknown">{KIND_LABELS[item.kind]}</Label>
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    ) : (
                        <div style={{padding: 16}}>
                            <Text variant="body-2" color="secondary">
                                Nothing found.
                            </Text>
                        </div>
                    )}
                </div>

                <div
                    style={{
                        padding: 12,
                        borderTop: '1px solid var(--g-color-line-generic)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                    }}
                >
                    <Text variant="caption-2" color="secondary">
                        ↑ ↓ navigate · Enter run · Esc close
                    </Text>

                    <Button view="flat-secondary" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </Card>
        </div>
    );
}
