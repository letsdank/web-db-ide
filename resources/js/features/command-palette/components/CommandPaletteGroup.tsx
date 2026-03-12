import {CommandPaletteItem} from "../../../types/commandPalette";
import {Text} from "@gravity-ui/uikit";
import {CommandPaletteItemRow} from "./CommandPaletteItemRow";

const KIND_LABELS: Record<CommandPaletteItem['kind'], string> = {
    action: 'Actions',
    tab: 'Tabs',
    connection: 'Connections',
    'saved-query': 'Saved queries',
};

interface Props {
    kind: CommandPaletteItem['kind'];
    items: CommandPaletteItem[];
    selectedIndex: number;
    startIndex: number;
    onSelectItem: (item: CommandPaletteItem) => void;
}

export function CommandPaletteGroup({
                                        kind,
                                        items,
                                        selectedIndex,
                                        startIndex,
                                        onSelectItem,
                                    }: Props) {
    return (
        <div className="command-palette-group">
            <div className="command-palette-group__title">
                <Text variant="caption-2" color="secondary">
                    {KIND_LABELS[kind]}
                </Text>
            </div>

            {items.map((item, index) => (
                <CommandPaletteItemRow
                    key={item.id}
                    item={item}
                    selected={startIndex + index === selectedIndex}
                    onSelect={() => onSelectItem(item)}
                />
            ))}
        </div>
    );
}
