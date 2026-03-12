import {CommandPaletteItem} from "../../../types/commandPalette";
import {useMemo} from "react";
import {Text} from "@gravity-ui/uikit";
import {CommandPaletteGroup} from "./CommandPaletteGroup";

interface Props {
    items: CommandPaletteItem[];
    selectedIndex: number;
    onSelectItem: (item: CommandPaletteItem) => void;
}

export function CommandPaletteList({
                                       items,
                                       selectedIndex,
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

    return (
        <div className="command-palette-list">
            {Object.entries(groupedItems).map(([kind, group]) => {
                const startIndex = offset;
                offset += group.length;

                return (
                    <CommandPaletteGroup
                        key={kind}
                        kind={kind as CommandPaletteItem['kind']}
                        items={group}
                        selectedIndex={selectedIndex}
                        startIndex={startIndex}
                        onSelectItem={onSelectItem}
                    />
                );
            })}
        </div>
    );
}
