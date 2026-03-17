import type {CommandPaletteItem} from "../../../types/commandPalette";
import {useMemo} from "react";
import {Text} from "@gravity-ui/uikit";
import {CommandPaletteGroup} from "./CommandPaletteGroup";

interface Props {
    items: CommandPaletteItem[];
    recentItems: CommandPaletteItem[];
    selectedIndex: number;
    query: string;
    onSelectItem: (item: CommandPaletteItem) => void;
}

export function CommandPaletteList({
                                       items,
                                       recentItems,
                                       selectedIndex,
                                       query,
                                       onSelectItem,
                                   }: Props) {
    const groupedItems = useMemo(() => {
        const groups: Record<string, CommandPaletteItem[]> = {};

        for (const item of items) {
            if (!groups[item.kind]) {
                groups[item.kind] = [];
            }

            groups[item.kind].push(item);
        }

        return groups;
    }, [items]);

    if (items.length === 0) {
        return (
            <div className="command-palette-list">
                <div className="command-palette-list__empty">
                    <Text variant="body-2" color="secondary">
                        Nothing found.
                    </Text>
                </div>
            </div>
        );
    }

    let offset = 0;
    const showRecent = !query.trim() && recentItems.length > 0;

    return (
        <div className="command-palette-list">
            {showRecent ? (
                <CommandPaletteGroup
                    kind="action"
                    title="Recent"
                    items={recentItems}
                    selectedIndex={selectedIndex}
                    startIndex={offset}
                    onSelectItem={onSelectItem}
                    showKindBadges
                />
            ) : null}

            {showRecent ? (offset += recentItems.length) : offset}

            {Object.entries(groupedItems).map(([kind, group]) => {
                const filteredGroup = showRecent
                    ? group.filter((item) => !recentItems.some((recent) => recent.id === item.id))
                    : group;

                if (filteredGroup.length === 0) {
                    return null;
                }

                const startIndex = offset;
                offset += filteredGroup.length;

                return (
                    <CommandPaletteGroup
                        key={kind}
                        kind={kind as CommandPaletteItem['kind']}
                        items={filteredGroup}
                        selectedIndex={selectedIndex}
                        startIndex={startIndex}
                        onSelectItem={onSelectItem}
                    />
                );
            })}
        </div>
    );
}
