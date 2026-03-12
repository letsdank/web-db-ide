import React from "react";
import {Card} from "@gravity-ui/uikit";

interface Props {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

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
