import type {CommandPaletteItem, CommandPaletteItemKind} from "../../../types/commandPalette";
import {useEffect, useMemo, useState} from "react";

function detectKindPrefix(query: string): {
    normalizedQuery: string;
    forcedKind: CommandPaletteItemKind | null;
} {
    const trimmed = query.trimStart();

    if (trimmed.startsWith('>')) {
        return {
            normalizedQuery: trimmed.slice(1).trimStart(),
            forcedKind: 'action',
        };
    }

    if (trimmed.startsWith('@')) {
        return {
            normalizedQuery: trimmed.slice(1).trimStart(),
            forcedKind: 'tab',
        };
    }

    if (trimmed.startsWith('#')) {
        return {
            normalizedQuery: trimmed.slice(1).trimStart(),
            forcedKind: 'connection',
        };
    }

    if (trimmed.startsWith('/')) {
        return {
            normalizedQuery: trimmed.slice(1).trimStart(),
            forcedKind: 'saved-query',
        };
    }

    return {
        normalizedQuery: query,
        forcedKind: null,
    };
}

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
    const [recentItemIds, setRecentItemIds] = useState<string[]>([]);

    useEffect(() => {
        if (!open) {
            setQuery('');
            setSelectedIndex(0);
        }
    }, [open]);

    const {normalizedQuery, forcedKind} = useMemo(
        () => detectKindPrefix(query),
        [query],
    );

    const filteredItems = useMemo(() => {
        let nextItems = items;

        if (forcedKind) {
            nextItems = nextItems.filter((item) => item.kind === forcedKind);
        }

        if (!normalizedQuery.trim()) {
            return nextItems;
        }

        return nextItems.filter((item) => matches(item, normalizedQuery.trim()));
    }, [forcedKind, items, normalizedQuery]);

    const recentItems = useMemo(() => {
        const byId = new Map(items.map((item) => [item.id, item]));

        return recentItemIds
            .map((id) => byId.get(id))
            .filter(Boolean) as CommandPaletteItem[];
    }, [items, recentItemIds]);

    useEffect(() => {
        if (selectedIndex >= filteredItems.length) {
            setSelectedIndex(0);
        }
    }, [filteredItems.length, selectedIndex]);

    function registerRecentItem(itemId: string) {
        setRecentItemIds((prev) => {
            const next = [itemId, ...prev.filter((id) => id !== itemId)];
            return next.slice(0, 8);
        });
    }

    return {
        query,
        setQuery,
        selectedIndex,
        setSelectedIndex,
        filteredItems,
        recentItems,
        forcedKind,
        registerRecentItem,
    };
}
