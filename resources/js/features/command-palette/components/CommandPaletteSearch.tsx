import {Label, Text, TextInput} from "@gravity-ui/uikit";

interface Props {
    query: string;
    onUpdateQuery: (value: string) => void;
}

export function CommandPaletteSearch({
                                         query,
                                         onUpdateQuery,
                                     }: Props) {
    return (
        <div className="command-palette-search">
            <div className="command-palette-search__header">
                <Text variant="header-1">Command Palette</Text>
                <Label theme="utility">Ctrl/Cmd + K</Label>
            </div>

            <TextInput
                size="xl"
                value={query}
                placeholder="Search actions, tabs, connections, saved queries..."
                autoFocus
                onUpdate={onUpdateQuery}
            />
        </div>
    );
}
