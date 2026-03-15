import {QueryTabDto} from "../../types/queryTab";
import {useContextMenu} from "../../hooks/useContextMenu";
import {WorkspaceContextMenu} from "./WorkspaceContextMenu";
import {Button, DropdownMenu, Icon, Tab, TabList, TabProvider, Text, TextInput} from "@gravity-ui/uikit";
import {CirclePlus, Ellipsis} from "@gravity-ui/icons";
import {useEffect, useMemo, useRef, useState} from "react";

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

export function QueryTabsBar({
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

    const editingTab = useMemo(
        () => tabs.find((tab) => tab.id === editingTabId) ?? null,
        [tabs, editingTabId],
    );

    function startRename(tab: QueryTabDto) {
        setEditingTabId(tab.id);
        setEditingTitle(tab.title || 'New Query');
    }

    function cancelRename() {
        setEditingTabId(null);
        setEditingTitle('');
    }

    function submitRename(tab: QueryTabDto) {
        const normalizedTitle = editingTitle.trim() || 'New Query';

        cancelRename();

        if (normalizedTitle === (tab.title || 'New Query')) {
            return;
        }

        onRename(tab, normalizedTitle);
    }

    function canMoveLeft(tab: QueryTabDto): boolean {
        const groupTabs = tabs.filter((item) => item.is_pinned === tab.is_pinned);
        const index = groupTabs.findIndex((item) => item.id === tab.id);

        return index > 0;
    }

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
                                text: 'Open new tab',
                                onClick: onCreate,
                            },
                            {
                                key: 'rename',
                                text: 'Rename tab',
                                onClick: () => startRename(contextTab),
                            },
                            {
                                key: 'duplicate',
                                text: 'Duplicate tab',
                                onClick: () => onDuplicate(contextTab),
                            },
                            {
                                key: 'move-left',
                                text: 'Move left',
                                disabled: !canMoveLeft(contextTab),
                                onClick: () => onMoveLeft(contextTab),
                            },
                            {
                                key: 'move-right',
                                text: 'Move right',
                                disabled: !canMoveRight(contextTab),
                                onClick: () => onMoveRight(contextTab),
                            },
                            {
                                key: 'pin',
                                text: contextTab.is_pinned ? 'Unpin tab' : 'Pin tab',
                                onClick: () => onTogglePin(contextTab),
                            },
                            {
                                key: 'close-others',
                                text: 'Close other tabs',
                                onClick: () => onCloseOthers(contextTab.id),
                            },
                            {
                                key: 'close',
                                text: 'Close tab',
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

                            const labelContent = isDirty ? 'Unsaved' : isPinned ? 'Pinned' : null;

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
                                        title={tab.title || "New Query"}
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
                                                    style={{width: 180}}
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
                                                    {tab.title || "New Query"}
                                                </Text>
                                            )}
                                        </span>
                                    </Tab>

                                    <DropdownMenu
                                        items={[
                                            {
                                                text: "Rename",
                                                action: () => startRename(tab),
                                            },

                                            {
                                                text: "Duplicate",
                                                action: () => onDuplicate(tab),
                                            },
                                            {
                                                text: "Move left",
                                                action: () => onMoveLeft(tab),
                                                disabled: !canTabMoveLeft,
                                            },
                                            {
                                                text: "Move right",
                                                action: () => onMoveRight(tab),
                                                disabled: !canTabMoveRight,
                                            },
                                            {
                                                text: isPinned ? "Unpin" : "Pin",
                                                action: () => onTogglePin(tab),
                                            },
                                            {
                                                text: "Close others",
                                                action: () => onCloseOthers(tab.id),
                                            },
                                            {
                                                text: "Close",
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
                                                onlyIcon
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
                New tab
            </Button>
        </div>
    );
}
