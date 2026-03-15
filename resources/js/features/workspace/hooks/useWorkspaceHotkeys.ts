import {useCallback, useEffect} from "react";
import {isEditableElement, isModKey} from "../../../lib/hotkeys";

interface Params {
    activeTabId: number | null;
    tabsCount: number;
    activeTabIndex: number;
    isCommandPaletteOpen: boolean;

    onOpenCommandPalette: () => void;
    onCreateTab: () => Promise<void> | void;
    onCloseActiveTab: (tabId: number) => Promise<void> | void;
    onFocusEditor: () => void;
    onSelectAdjacentTab: (direction: 'next' | 'prev') => void;
}

export function useWorkspaceHotkeys({
                                        activeTabId,
                                        tabsCount,
                                        activeTabIndex,
                                        isCommandPaletteOpen,
                                        onOpenCommandPalette,
                                        onCreateTab,
                                        onCloseActiveTab,
                                        onFocusEditor,
                                        onSelectAdjacentTab,
                                    }: Params) {
    const handleSelectAdjacentTabSafe = useCallback((direction: 'next' | 'prev') => {
        if (tabsCount === 0) {
            return;
        }

        const currentIndex = activeTabIndex >= 0 ? activeTabIndex : 0;
        const delta = direction === 'next' ? 1 : -1;
        const nextIndex = (currentIndex + delta + tabsCount) % tabsCount;

        if (nextIndex === currentIndex && tabsCount <= 1) {
            return;
        }

        onSelectAdjacentTab(direction);
    }, [activeTabIndex, onSelectAdjacentTab, tabsCount]);

    useEffect(() => {
        function handleGlobalKeyDown(event: KeyboardEvent) {
            const key = event.key.toLowerCase();
            const editable = isEditableElement(event.target);

            if (isModKey(event) && key === 'k') {
                event.preventDefault();
                onOpenCommandPalette();
                return;
            }

            if (isCommandPaletteOpen) {
                return;
            }

            if (isModKey(event) && key === 't' && !event.shiftKey) {
                event.preventDefault();
                void onCreateTab();
                return;
            }

            if (isModKey(event) && key === 'w' && !event.shiftKey) {
                if (!activeTabId || editable) {
                    return;
                }

                event.preventDefault();
                void onCloseActiveTab(activeTabId);
                return;
            }

            if (isModKey(event) && key === '1' && !event.shiftKey) {
                event.preventDefault();
                onFocusEditor();
                return;
            }

            if (isModKey(event) && event.shiftKey && event.key === '[') {
                event.preventDefault();
                handleSelectAdjacentTabSafe('prev');
                return;
            }

            if (isModKey(event) && event.shiftKey && event.key === ']') {
                event.preventDefault();
                handleSelectAdjacentTabSafe('next');
                return;
            }
        }

        window.addEventListener('keydown', handleGlobalKeyDown);

        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [
        activeTabId,
        handleSelectAdjacentTabSafe,
        isCommandPaletteOpen,
        onCloseActiveTab,
        onCreateTab,
        onFocusEditor,
        onOpenCommandPalette,
    ]);
}
