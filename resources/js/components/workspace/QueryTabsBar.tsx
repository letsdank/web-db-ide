import {QueryTabDto} from "../../types/queryTab";
import {Button, Card, DropdownMenu, Icon, Label, Text} from "@gravity-ui/uikit";
import {useContextMenu} from "../../hooks/useContextMenu";
import {WorkspaceContextMenu} from "./WorkspaceContextMenu";
import {Ellipsis} from "@gravity-ui/icons";

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

    return (
        <Card view="filled" style={{padding: 10}}>
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

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minWidth: 0,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        gap: 8,
                        overflowX: 'auto',
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    {tabs.map((tab) => {
                        const isActive = tab.id === activeTabId;
                        const isDirty = dirtyTabIds.includes(tab.id);
                        const isPinned = Boolean(tab.is_pinned);

                        return (
                            <div
                                key={tab.id}
                                onContextMenu={(event) => openContextMenu(event, tab)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    minWidth: 0,
                                    padding: '8px 10px',
                                    borderRadius: 10,
                                    border: isActive
                                        ? '1px solid var(--g-color-line-brand)'
                                        : '1px solid var(--g-color-line-generic)',
                                    background: isActive
                                        ? 'var(--g-color-base-selection)'
                                        : 'var(--g-color-base-float)',
                                }}
                            >
                                <button
                                    onClick={() => onSelect(tab.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        border: 'none',
                                        background: 'transparent',
                                        padding: 0,
                                        cursor: 'pointer',
                                        minWidth: 0,
                                        color: 'inherit',
                                    }}
                                >
                                    <Text variant="body-2" style={{whiteSpace: 'nowrap'}}>
                                        {tab.title || 'New Query'}
                                    </Text>

                                    {isDirty ? (
                                        <span
                                            style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: 999,
                                                background: 'var(--g-color-text-brand)',
                                                display: 'inline-block',
                                                flexShrink: 0,
                                            }}
                                        />
                                    ) : null}
                                </button>

                                {isPinned ? <Label theme="info">Pinned</Label> : null}

                                <DropdownMenu
                                    items={[
                                        {
                                            text: 'Duplicate',
                                            action:()=>onDuplicate(tab),
                                        },
                                        {
                                            text: isPinned?'Unpin':'Pin',
                                            action: ()=>onTogglePin(tab),
                                        },
                                        {
                                            text:'Close others',
                                            action:()=>onCloseOthers(tab.id),
                                        },
                                        {
                                            text:'Close',
                                            action:()=>onClose(tab.id),
                                            theme:'danger',
                                            disabled:isPinned,
                                        },
                                    ]}
                                    renderSwitcher={(props) => (
                                        <Button {...props} size="s" view="flat-secondary">
                                            <Icon data={Ellipsis} size={16} />
                                        </Button>
                                    )}
                                />
                            </div>
                        );
                    })}
                </div>

                <Button view="action" onClick={onCreate}>
                    New tab
                </Button>
            </div>
        </Card>
    );
}
