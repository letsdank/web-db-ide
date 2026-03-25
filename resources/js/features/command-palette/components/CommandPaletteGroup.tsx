import type {CommandPaletteItem} from "../../../types/commandPalette";
import {Text} from "@gravity-ui/uikit";
import {CommandPaletteItemRow} from "./CommandPaletteItemRow";

/**
 * Default visible label for each palette group kind.
 */
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

/**
 * Renders one grouped section inside the command palette list.
 *
 * `startIndex` is the absolute index offset of this group inside the full list,
 * so selected-row highlighting can be computed without flattening the UI again.
 */
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
