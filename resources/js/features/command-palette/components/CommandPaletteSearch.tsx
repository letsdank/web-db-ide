import {Label, Text, TextInput} from "@gravity-ui/uikit";
import type {CommandPaletteItemKind} from "../../../types/commandPalette";

interface Props {
    query: string;
    forcedKind: CommandPaletteItemKind | null;
    onUpdateQuery: (value: string) => void;
}

/**
 * Maps the currently forced mode into a human-readable badge label.
 */
function getModeLabel(kind: CommandPaletteItemKind | null): string {
    switch (kind) {
        case 'action':
            return 'Actions mode';
        case 'tab':
            return 'Tabs mode';
        case 'connection':
            return 'Connections mode';
        case'saved-query':
            return 'Saved queries mode';
        default:
            return 'All';
    }
}

/**
 * Header and search box for the command palette.
 *
 * The search input supports prefix-based modes:
 * - `>` actions
 * - `@` tabs
 * - `#` connections
 * - `/` saved queries
 */
export function CommandPaletteSearch({
                                         query,
                                         forcedKind,
                                         onUpdateQuery,
                                     }: Props) {
    return (
        <div className="command-palette-search">
            <div className="command-palette-search__header">
                <Text variant="header-1">Command Palette</Text>

                <div className="command-palette-search__badges">
                    <Label theme="utility">Ctrl/Cmd + K</Label>
                    <Label theme="info">{getModeLabel(forcedKind)}</Label>
                </div>
            </div>

            <TextInput
                size="xl"
                value={query}
                placeholder="Search... Use > @ # / for modes"
                autoFocus
                onUpdate={onUpdateQuery}
            />

            <div className="command-palette-search__hints">
                <Text variant="caption-2" color="secondary">
                    {'>'} actions
                </Text>
                <Text variant="caption-2" color="secondary">
                    @ tabs
                </Text>
                <Text variant="caption-2" color="secondary">
                    # connections
                </Text>
                <Text variant="caption-2" color="secondary">
                    / saved
                </Text>
            </div>
        </div>
    );
}
