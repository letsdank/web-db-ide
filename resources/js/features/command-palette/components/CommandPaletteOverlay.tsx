import React from "react";
import {Card} from "@gravity-ui/uikit";

interface Props {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

/**
 * Lightweight modal shell for the command palette.
 *
 * Responsibilities:
 * - render nothing when the palette is closed
 * - close on backdrop click
 * - stop click propagation inside the palette card
 *
 * Keyboard handling and focus management live outside this component.
 */
export function CommandPaletteOverlay({
                                          open,
                                          onClose,
                                          children
                                      }: Props) {
    if (!open) {
        return null;
    }

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <Card
                view="filled"
                className="command-palette-overlay__card"
                onClick={(event) => event.stopPropagation()}
            >
                {children}
            </Card>
        </div>
    );
}
