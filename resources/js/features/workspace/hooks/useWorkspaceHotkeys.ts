import {useEffect} from "react";
import {isEditableElement, isModKey} from "../../../lib/hotkeys";

interface Params {
    activeTabId: number | null;
    isCommandPaletteOpen: boolean;

    onOpenCommandPalette: () => void;
    onCreateTab: () => Promise<void> | void;
    onCloseActiveTab: (tabId: number) => Promise<void> | void;
    onFocusEditor: () => void;
    onSelectAdjacentTab: (direction: 'next' | 'prev') => void;
}

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

            if (isModKey(event) && key === 'k') {
                event.preventDefault();
                event.stopPropagation();
                onOpenCommandPalette();
                return;
            }

            if (isCommandPaletteOpen) {
                return;
            }

            if (isModKey(event) && event.shiftKey && key === 't') {
                event.preventDefault();
                event.stopPropagation();
                void onCreateTab();
                return;
            }

            if (isModKey(event) && event.shiftKey && key === 'w') {
                if (!activeTabId || editable) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                void onCloseActiveTab(activeTabId);
                return;
            }

            if (isModKey(event) && key === '1' && !event.shiftKey) {
                event.preventDefault();
                event.stopPropagation();
                onFocusEditor();
                return;
            }

            const isPrevTabHotkey =
                (event.altKey && event.shiftKey && event.code === 'ArrowLeft') ||
                (isModKey(event) && event.shiftKey && event.code === 'BracketLeft');

            if (isPrevTabHotkey) {
                event.preventDefault();
                event.stopPropagation();
                onSelectAdjacentTab('prev');
                return;
            }

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
