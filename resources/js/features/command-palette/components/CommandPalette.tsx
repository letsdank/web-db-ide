import {CommandPaletteItem} from "../../../types/commandPalette";
import {useEffect} from "react";
import {Button, Text} from "@gravity-ui/uikit";
import {useCommandPalette} from "../hooks/useCommandPalette";
import {CommandPaletteOverlay} from "./CommandPaletteOverlay";
import {CommandPaletteSearch} from "./CommandPaletteSearch";
import {CommandPaletteList} from "./CommandPaletteList";

interface Props {
    open: boolean;
    items: CommandPaletteItem[];
    onClose: () => void;
}

export function CommandPalette({
                                   open,
                                   items,
                                   onClose,
                               }: Props) {
    const {
        query,
        setQuery,
        selectedIndex,
        setSelectedIndex,
        filteredItems,
    } = useCommandPalette(open, items);

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
    }, [filteredItems, onClose, open, selectedIndex, setSelectedIndex]);

    return (
        <CommandPaletteOverlay open={open} onClose={onClose}>
            <CommandPaletteSearch
                query={query}
                onUpdateQuery={setQuery}
            />

            <CommandPaletteList
                items={filteredItems}
                selectedIndex={selectedIndex}
                onSelectItem={(item) => {
                    void Promise.resolve(item.onSelect()).finally(() => {
                        onClose();
                    });
                }}
            />

            <div className="command-palette-footer">
                <Text variant="caption-2" color="secondary">
                    ↑ ↓ navigate · Enter run · Esc close
                </Text>

                <Button view="flat-secondary" onClick={onClose}>
                    Close
                </Button>
            </div>
        </CommandPaletteOverlay>
    );
}
