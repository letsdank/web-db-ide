import {useEffect} from "react";
import {isEditableElement, isModKey} from "../../../lib/hotkeys";

/**
 * Dependencies required by the global workspace hotkey layer.
 */
interface Params {
    activeTabId: number | null;
    isCommandPaletteOpen: boolean;

    onOpenCommandPalette: () => void;
    onCreateTab: () => Promise<void> | void;
    onCloseActiveTab: (tabId: number) => Promise<void> | void;
    onFocusEditor: () => void;
    onSelectAdjacentTab: (direction: 'next' | 'prev') => void;
}

/**
 * Registers global IDE hotkeys for the workspace shell.
 *
 * The hook intentionally guards against collisions with editable elements and
 * pauses must shortcuts while the command palette is open.
 */
export function useWorkspaceHotkeys({
                                        activeTabId,
                                        isCommandPaletteOpen,
                                        onOpenCommandPalette,
                                        onCreateTab,
                                        onCloseActiveTab,
                                        onFocusEditor,
                                        onSelectAdjacentTab,
                                    }: Params) {
    useEffect(() => {
        function handleGlobalKeyDown(event: KeyboardEvent) {
            const key = event.key.toLowerCase();
            const editable = isEditableElement(event.target);

            /**
             * Global command palette shortcut. This one always wins.
             */
            if (isModKey(event) && key === 'k') {
                event.preventDefault();
                event.stopPropagation();
                onOpenCommandPalette();
                return;
            }

            /**
             * While the command palette is open, the palette owns keyboard input.
             */
            if (isCommandPaletteOpen) {
                return;
            }

            /**
             * Create a new tab.
             */
            if (isModKey(event) && event.shiftKey && key === 't') {
                event.preventDefault();
                event.stopPropagation();
                void onCreateTab();
                return;
            }

            /**
             * Close the active tab, but avoid hijacking shortcuts inside editable
             * inputs where the user may be typing.
             */
            if (isModKey(event) && event.shiftKey && key === 'w') {
                if (!activeTabId || editable) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                void onCloseActiveTab(activeTabId);
                return;
            }

            /**
             * Focus the SQL editor.
             */
            if (isModKey(event) && key === '1' && !event.shiftKey) {
                event.preventDefault();
                event.stopPropagation();
                onFocusEditor();
                return;
            }

            /**
             * Previous-tab navigation supports both Alt+Shift+ArrowLeft and the
             * bracket-based shortcut for IDE-style workflows.
             */
            const isPrevTabHotkey =
                (event.altKey && event.shiftKey && event.code === 'ArrowLeft') ||
                (isModKey(event) && event.shiftKey && event.code === 'BracketLeft');

            if (isPrevTabHotkey) {
                event.preventDefault();
                event.stopPropagation();
                onSelectAdjacentTab('prev');
                return;
            }

            /**
             * Next-tab navigation supports both Alt+Shift+ArrowRight and the
             * bracket-based shortcut for IDE-style workflows.
             */
            const isNextTabHotkey =
                (event.altKey && event.shiftKey && event.code === 'ArrowRight') ||
                (isModKey(event) && event.shiftKey && event.code === 'BracketRight');

            if (isNextTabHotkey) {
                event.preventDefault();
                event.stopPropagation();
                onSelectAdjacentTab('next');
            }
        }

        window.addEventListener('keydown', handleGlobalKeyDown);

        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [
        activeTabId,
        isCommandPaletteOpen,
        onCloseActiveTab,
        onCreateTab,
        onFocusEditor,
        onOpenCommandPalette,
        onSelectAdjacentTab,
    ]);
}
