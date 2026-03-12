import {ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import React from "react";
import {Button, DropdownMenu, Icon, Label, Text} from "@gravity-ui/uikit";
import {Ellipsis} from "@gravity-ui/icons";

interface Props {
    connectionId: number;
    schema: string;
    table: ExplorerTableDto;
    details?: ExplorerTableDetailsDto;
    isExpanded: boolean;
    isLoadingDetails: boolean;
    onToggle: () => void;
    onOpenContextMenu: (event: React.MouseEvent) => void;
    onOpenSelect: () => void;
    onOpenCount: () => void;
    onOpenMetadata: () => void;
    onCopyFullName: () => void;
}

export function ExplorerTableNode({
                                      table,
                                      details,
                                      isExpanded,
                                      isLoadingDetails,
                                      onToggle,
                                      onOpenContextMenu,
                                      onOpenSelect,
                                      onOpenCount,
                                      onOpenMetadata,
                                      onCopyFullName,
                                  }: Props) {
    return (
        <div>
            <div
                onContextMenu={onOpenContextMenu}
                className="explorer-table-node"
            >
                <button
                    onClick={onToggle}
                    className="explorer-table-node__toggle"
                >
                    <div className="explorer-table-node__title-row">
                        <Text variant="body-2">
                            {table.table_name}
                        </Text>

                        <Label theme="unknown">
                            {table.table_type}
                        </Label>
                    </div>
                </button>

                <DropdownMenu
                    items={[
                        {
                            text: 'Select top 100',
                            action: onOpenSelect,
                        },
                        {
                            text: 'Count rows',
                            action: onOpenCount,
                        },
                        {
                            text: 'Open metadata',
                            action: onOpenMetadata,
                        },
                        {
                            text: 'Copy full name',
                            action: onCopyFullName,
                        },
                    ]}
                    renderSwitcher={(props) => (
                        <Button {...props} size="s" view="flat-secondary">
                            <Icon data={Ellipsis} size={16}/>
                        </Button>
                    )}
                />
            </div>

            {isExpanded ? (
                <div className="explorer-table-node__details">
                    {isLoadingDetails ? (
                        <Text variant="body-2" color="secondary">
                            Loading columns...
                        </Text>
                    ) : details ? (
                        <>
                            <div className="explorer-table-node__columns">
                                {details.columns.map((column) => (
                                    <div key={column.column_name}>
                                        <Text variant="caption-2" color="secondary">
                                            {column.column_name} · {column.data_type}
                                        </Text>
                                    </div>
                                ))}
                            </div>

                            {details.indexes.length > 0 ? (
                                <Text variant="caption-2" color="secondary">
                                    {details.indexes.length} indexes
                                </Text>
                            ) : null}
                        </>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
