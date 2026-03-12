import {CommandPaletteItem} from "../../../types/commandPalette";
import {useEffect, useMemo, useState} from "react";

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

export function useCommandPalette(open: boolean, items: CommandPaletteItem[]) {
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

    useEffect(() => {
        if (selectedIndex >= filteredItems.length) {
            setSelectedIndex(0);
        }
    }, [filteredItems.length, selectedIndex]);

    return {
        query,
        setQuery,
        selectedIndex,
        setSelectedIndex,
        filteredItems,
    };
}
