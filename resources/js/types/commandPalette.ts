import React from "react";

export type CommandPaletteItemKind =
    | 'action'
    | 'tab'
    | 'connection'
    | 'saved-query';

export interface CommandPaletteItem {
    id: string;
    title: string;
    subtitle?: string | null;
    keywords?: string[];
    kind: CommandPaletteItemKind;
    icon?: React.ReactNode;
    onSelect: () => void | Promise<void>;
}
