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
    title?: string;
    showKindBadges?: boolean;
}

export function CommandPaletteGroup({
                                        kind,
                                        items,
                                        selectedIndex,
                                        startIndex,
                                        onSelectItem,
                                        title,
                                        showKindBadges = false,
                                    }: Props) {
    return (
        <div className="command-palette-group">
            <div className="command-palette-group__title">
                <Text variant="caption-2" color="secondary">
                    {title ?? KIND_LABELS[kind]}
                </Text>
            </div>

            {items.map((item, index) => (
                <CommandPaletteItemRow
                    key={item.id}
                    item={item}
                    selected={startIndex + index === selectedIndex}
                    showKindBadge={showKindBadges}
                    onSelect={() => onSelectItem(item)}
                />
            ))}
        </div>
    );
}
