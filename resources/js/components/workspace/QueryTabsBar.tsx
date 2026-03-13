import {QueryTabDto} from "../../types/queryTab";
import {useContextMenu} from "../../hooks/useContextMenu";
import {WorkspaceContextMenu} from "./WorkspaceContextMenu";
import {Button, DropdownMenu, Icon, Label, Tab, TabList, TabProvider, Text} from "@gravity-ui/uikit";
import {CirclePlus, Ellipsis} from "@gravity-ui/icons";

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
                             }: Props) {
    const {
        state,
        anchorRef,
        anchorStyle,
        openContextMenu,
        closeContextMenu,
    } = useContextMenu<QueryTabDto>();

    const contextTab = state.payload;
    const activeValue = activeTabId ? String(activeTabId) : undefined;

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                minWidth: 0,
                padding: "0 4px",
            }}
        >
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
                                key: 'duplicate',
                                text: 'Duplicate tab',
                                onClick: () => onDuplicate(contextTab),
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

            <div style={{flex: 1, minWidth: 0, overflowX: "auto"}}>
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

                            const labelContent = isDirty ? 'Unsaved' : isPinned ? 'Pinned' : null;

                            const label = {
                                content: labelContent ? <span>{labelContent}</span> : null,
                                label: isDirty ? 'warning' : isPinned ? 'info' : 'unknown',
                            };

                            return (
                                <div
                                    key={tab.id}
                                    onContextMenu={(event) => openContextMenu(event, tab)}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                        marginRight: 6,
                                    }}
                                >
                                    <Tab
                                        value={String(tab.id)}
                                        title={tab.title || "New Query"}
                                        label={label}
                                    >
                                        <span
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 8,
                                                minWidth: 0,
                                            }}
                                        >
                                            <Text
                                                variant="body-2"
                                                style={{
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    maxWidth: 180,
                                                }}
                                            >
                                                {tab.title || "New Query"}
                                            </Text>
                                        </span>
                                    </Tab>

                                    <DropdownMenu
                                        items={[
                                            {
                                                text: "Duplicate",
                                                action: () => onDuplicate(tab),
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
