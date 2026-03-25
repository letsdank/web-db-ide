import type {QueryTabDto} from "../../types/queryTab";
import {useContextMenu} from "../../hooks/useContextMenu";
import {WorkspaceContextMenu} from "./WorkspaceContextMenu";
import {Button, DropdownMenu, Icon, Tab, TabList, TabProvider, Text, TextInput} from "@gravity-ui/uikit";
import {CirclePlus, Ellipsis} from "@gravity-ui/icons";
import React, {useEffect, useRef, useState} from "react";
import {useI18n} from "../../i18n";

/**
 * Props for the workspace tab strip.
 *
 * The component itself is presentation-heavy, but it also owns a small amount
 * of local interaction state for inline rename and context-menu invocation.
 */
interface Props {
    tabs: QueryTabDto[];
    activeTabId: number | null;
    dirtyTabIds: number[];
    onSelect: (id: number) => void;
    onCreate: () => void;
    onClose: (id: number) => void;
    onCloseOthers: (id: number) => void;
    onTogglePin: (tab: QueryTabDto) => void;
    onDuplicate: (tab: QueryTabDto) => void;
    onMoveLeft: (tab: QueryTabDto) => void;
    onMoveRight: (tab: QueryTabDto) => void;
    onRename: (tab: QueryTabDto, title: string) => void;
}

/**
 * Main tab strip for the workspace shell.
 *
 * Supported interactions:
 * - select tab
 * - create tab
 * - inline rename
 * - context-menu actions
 * - pin/unpin
 * - duplicate
 * - close / close others
 * - move inside the current pin group
 *
 * Persisted tab mutations are delegated upward through callbacks.
 */
export const QueryTabsBar = React.memo(function QueryTabsBar({
                                                                 tabs,
                                                                 activeTabId,
                                                                 dirtyTabIds,
                                                                 onSelect,
                                                                 onCreate,
                                                                 onClose,
                                                                 onCloseOthers,
                                                                 onTogglePin,
                                                                 onDuplicate,
                                                                 onMoveLeft,
                                                                 onMoveRight,
                                                                 onRename,
                                                             }: Props) {
    const {t} = useI18n();

    const {
        state,
        anchorRef,
        anchorStyle,
        openContextMenu,
        closeContextMenu,
    } = useContextMenu<QueryTabDto>();

    const [editingTabId, setEditingTabId] = useState<number | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const inputRef = useRef<HTMLInputElement | null>(null);

    const contextTab = state.payload;
    const activeValue = activeTabId ? String(activeTabId) : undefined;

    useEffect(() => {
        if (editingTabId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingTabId]);

    /**
     * Enters inline rename mode for the requested tab.
     */
    function startRename(tab: QueryTabDto) {
        setEditingTabId(tab.id);
        setEditingTitle(tab.title || t('workspace.newQuery'));
    }

    /**
     * Leaves inline rename mode without persisting changes.
     */
    function cancelRename() {
        setEditingTabId(null);
        setEditingTitle('');
    }

    /**
     * Normalizes and submits the inline rename value.
     *
     * Empty titles fall back to the localized default tab name.
     */
    function submitRename(tab: QueryTabDto) {
        const normalizedTitle = editingTitle.trim() || t('workspace.newQuery');

        cancelRename();

        if (normalizedTitle === (tab.title || t('workspace.newQuery'))) {
            return;
        }

        onRename(tab, normalizedTitle);
    }

    /**
     * Returns true when the tab can move left inside its current pin group.
     */
    function canMoveLeft(tab: QueryTabDto): boolean {
        const groupTabs = tabs.filter((item) => item.is_pinned === tab.is_pinned);
        const index = groupTabs.findIndex((item) => item.id === tab.id);

        return index > 0;
    }

    /**
     * Returns true when the tab can move right inside its current pin group.
     */
    function canMoveRight(tab: QueryTabDto): boolean {
        const groupTabs = tabs.filter((item) => item.is_pinned === tab.is_pinned);
        const index = groupTabs.findIndex((item) => item.id === tab.id);

        return index !== -1 && index < groupTabs.length - 1;
    }

    return (
        <div className="query-tabs-bar">
            <div ref={anchorRef} style={anchorStyle}/>

            <WorkspaceContextMenu
                open={state.open}
                anchorElement={anchorRef.current}
                onClose={closeContextMenu}
                actions={
                    contextTab
                        ? [
                            {
                                key: 'new',
                                text: t('workspace.openNewTab'),
                                onClick: onCreate,
                            },
                            {
                                key: 'rename',
                                text: t('workspace.renameTab'),
                                onClick: () => startRename(contextTab),
                            },
                            {
                                key: 'duplicate',
                                text: t('workspace.duplicateTab'),
                                onClick: () => onDuplicate(contextTab),
                            },
                            {
                                key: 'move-left',
                                text: t('workspace.moveLeft'),
                                disabled: !canMoveLeft(contextTab),
                                onClick: () => onMoveLeft(contextTab),
                            },
                            {
                                key: 'move-right',
                                text: t('workspace.moveRight'),
                                disabled: !canMoveRight(contextTab),
                                onClick: () => onMoveRight(contextTab),
                            },
                            {
                                key: 'pin',
                                text: contextTab.is_pinned ? t('workspace.unpinTab') : t('workspace.pinTab'),
                                onClick: () => onTogglePin(contextTab),
                            },
                            {
                                key: 'close-others',
                                text: t('workspace.closeOtherTabs'),
                                onClick: () => onCloseOthers(contextTab.id),
                            },
                            {
                                key: 'close',
                                text: t('workspace.closeTab'),
                                danger: true,
                                disabled: Boolean(contextTab.is_pinned),
                                onClick: () => onClose(contextTab.id),
                            },
                        ]
                        : []
                }
            />

            <div className="query-tabs-bar__scroller">
                <TabProvider
                    value={activeValue}
                    onUpdate={(value) => {
                        const nextId = Number(value);
                        if (!Number.isNaN(nextId)) {
                            onSelect(nextId);
                        }
                    }}
                >
                    <TabList size="m">
                        {tabs.map((tab) => {
                            const isDirty = dirtyTabIds.includes(tab.id);
                            const isPinned = Boolean(tab.is_pinned);
                            const canTabMoveLeft = canMoveLeft(tab);
                            const canTabMoveRight = canMoveRight(tab);
                            const isEditing = editingTabId === tab.id;

                            const labelContent = isDirty
                                ? t('workspace.unsaved')
                                : isPinned
                                    ? t('workspace.pinned') :
                                    null;

                            const label = {
                                content: labelContent ? <span>{labelContent}</span> : null,
                                label: isDirty ? 'warning' : isPinned ? 'info' : 'unknown',
                            };

                            return (
                                <div
                                    key={tab.id}
                                    onContextMenu={(event) => openContextMenu(event, tab)}
                                    className="query-tabs-bar__item"
                                >
                                    <Tab
                                        value={String(tab.id)}
                                        title={tab.title || t('workspace.newQuery')}
                                        label={label}
                                    >
                                        <span
                                            className="query-tabs-bar__label"
                                            onDoubleClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                startRename(tab);
                                            }}
                                        >
                                            {isEditing ? (
                                                <div
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                    }}
                                                    className="query-tabs-bar__rename-input"
                                                >
                                                    <TextInput
                                                        controlRef={inputRef}
                                                        value={editingTitle}
                                                        size="s"
                                                        onUpdate={setEditingTitle}
                                                        onBlur={() => submitRename(tab)}
                                                        onKeyDown={(event) => {
                                                            if (event.key === 'Enter') {
                                                                event.preventDefault();
                                                                submitRename(tab);
                                                            }
                                                            if (event.key === 'Escape') {
                                                                event.preventDefault();
                                                                cancelRename();
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <Text
                                                    variant="body-2"
                                                    className="query-tabs-bar__title"
                                                >
                                                    {tab.title || t('workspace.newQuery')}
                                                </Text>
                                            )}
                                        </span>
                                    </Tab>

                                    <DropdownMenu
                                        items={[
                                            {
                                                text: t('workspace.rename'),
                                                action: () => startRename(tab),
                                            },

                                            {
                                                text: t('workspace.duplicate'),
                                                action: () => onDuplicate(tab),
                                            },
                                            {
                                                text: t('workspace.moveLeft'),
                                                action: () => onMoveLeft(tab),
                                                disabled: !canTabMoveLeft,
                                            },
                                            {
                                                text: t('workspace.moveRight'),
                                                action: () => onMoveRight(tab),
                                                disabled: !canTabMoveRight,
                                            },
                                            {
                                                text: isPinned ? t('workspace.unpinTab') : t('workspace.pinTab'),
                                                action: () => onTogglePin(tab),
                                            },
                                            {
                                                text: t('workspace.closeOtherTabs'),
                                                action: () => onCloseOthers(tab.id),
                                            },
                                            {
                                                text: t('workspace.close'),
                                                action: () => onClose(tab.id),
                                                theme: "danger",
                                                disabled: isPinned,
                                            },
                                        ]}
                                        renderSwitcher={(props) => (
                                            <Button
                                                {...props}
                                                size="s"
                                                view="flat-secondary"
                                            >
                                                <Icon data={Ellipsis} size={16}/>
                                            </Button>
                                        )}
                                    />
                                </div>
                            );
                        })}
                    </TabList>
                </TabProvider>
            </div>

            <Button view="action" size="m" onClick={onCreate}>
                <Icon data={CirclePlus} size={16}/>
                {t('workspace.newTab')}
            </Button>
        </div>
    );
});
