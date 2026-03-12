import React from "react";
import {Icon, Menu, Popup} from "@gravity-ui/uikit";
import {ArrowsRotateRight, Bars, CirclePlus, Copy, Pin, Xmark} from "@gravity-ui/icons";

export interface WorkspaceContextAction {
    key: string;
    text: string;
    icon?: React.ReactNode;
    danger?: boolean;
    disabled?: boolean;
    onClick: () => void;
}

interface Props {
    open: boolean;
    anchorElement: HTMLElement | null;
    actions: WorkspaceContextAction[];
    onClose: () => void;
}

function fallbackIcon(key: string) {
    switch (key) {
        case 'new':
            return <Icon data={CirclePlus} size={16}/>;
        case 'duplicate':
            return <Icon data={Copy} size={16}/>;
        case 'pin':
            return <Icon data={Pin} size={16}/>;
        case 'close':
            return <Icon data={Xmark} size={16}/>;
        case 'close-others':
            return <Icon data={Bars} size={16}/>;
        case 'refresh':
            return <Icon data={ArrowsRotateRight} size={16}/>;
        default:
            return null;
    }
}

export function WorkspaceContextMenu({
                                         open,
                                         anchorElement,
                                         actions,
                                         onClose,
                                     }: Props) {
    return (
        <Popup
            open={open}
            anchorElement={anchorElement}
            placement="bottom-start"
            hasArrow={false}
            onClose={onClose}
        >
            <div
                style={{
                    minWidth: 220,
                    padding: 4,
                }}
            >
                <Menu size="m">
                    {actions.map((action) => (
                        <Menu.Item
                            key={action.key}
                            iconStart={action.icon ?? fallbackIcon(action.key)}
                            theme={action.danger ? 'danger' : 'normal'}
                            disabled={action.disabled}
                            onClick={() => {
                                action.onClick();
                                onClose();
                            }}
                        >
                            {action.text}
                        </Menu.Item>
                    ))}
                </Menu>
            </div>
        </Popup>
    );
}
