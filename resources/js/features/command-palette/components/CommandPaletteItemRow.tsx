import type {CommandPaletteItem} from "../../../types/commandPalette";
import {Label, Text} from "@gravity-ui/uikit";

/**
 * Visual label for each palette item kind.
 */
const KIND_LABELS: Record<CommandPaletteItem['kind'], string> = {
    action: 'Actions',
    tab: 'Tabs',
    connection: 'Connections',
    'saved-query': 'Saved queries',
};

interface Props {
    item: CommandPaletteItem;
    selected: boolean;
    onSelect: () => void;
    showKindBadge?: boolean;
}

/**
 * Renders a single selectable command-palette row.
 *
 * The row is intentionally presentation-only:
 * - selection styling is controlled from above
 * - click behavior is delegated through `onSelect`
 * - grouping and keyboard navigation live in parent components
 */
export function CommandPaletteItemRow({
                                          item,
                                          selected,
                                          onSelect,
                                          showKindBadge = true,
                                      }: Props) {
    return (
        <button
            onClick={onSelect}
            className={[
                "command-palette-item",
                selected ? "command-palette-item--selected" : "",
            ].filter(Boolean).join(" ")}
        >
            <div className="command-palette-item__left">
                {item.icon ? (
                    <div className="command-palette-item__icon">
                        {item.icon}
                    </div>
                ) : null}

                <div className="command-palette-item__content">
                    <Text variant="body-2" className="command-palette-item__title">
                        {item.title}
                    </Text>

                    {item.subtitle ? (
                        <Text
                            variant="caption-2"
                            color="secondary"
                            className="command-palette-item__subtitle"
                        >
                            {item.subtitle}
                        </Text>
                    ) : null}
                </div>
            </div>

            {showKindBadge ? (
                <Label theme="unknown">{KIND_LABELS[item.kind]}</Label>
            ) : null}
        </button>
    );
}
