import {ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import React from "react";
import {Button, ClipboardButton, DropdownMenu, Icon, Label, Loader, Text} from "@gravity-ui/uikit";
import {ChevronDown, ChevronRight, Ellipsis, LayoutHeaderCellsLargeFill} from "@gravity-ui/icons";

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
        <div className="explorer-table-node">
            <div
                onContextMenu={onOpenContextMenu}
                className="explorer-table-node__row"
            >
                <button
                    onClick={onToggle}
                    className="explorer-table-node__toggle"
                    type="button"
                >
                    <div className="explorer-table-node__title-row">
                        <Icon data={LayoutHeaderCellsLargeFill} size={16}/>
                        <Text variant="body-2">
                            {table.table_name}
                        </Text>

                        <Label theme="unknown">
                            {table.table_type}
                        </Label>
                    </div>

                    <Button
                        size="s"
                        view="flat-secondary"
                        onlyIcon
                        tabIndex={-1}
                    >
                        <Icon data={isExpanded ? ChevronDown : ChevronRight} size={16}/>
                    </Button>
                </button>

                <div className="explorer-table-node__actions">
                    <ClipboardButton
                        size="m"
                        text={table.table_name}
                        tooltipInitialText="Copy table name"
                        tooltipSuccessText="Copied"
                    />

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
                            <Button {...props} size="s" view="flat-secondary" onlyIcon>
                                <Icon data={Ellipsis} size={16}/>
                            </Button>
                        )}
                    />
                </div>
            </div>

            {isExpanded ? (
                <div className="explorer-table-node__details">
                    {isLoadingDetails ? (
                        <div className="explorer-table-node__loading">
                            <Loader size="s"/>
                            <Text variant="body-2" color="secondary">
                                Loading columns...
                            </Text>
                        </div>
                    ) : details ? (
                        <>
                            <div className="explorer-table-node__columns">
                                {details.columns.map((column) => (
                                    <div key={column.column_name} className="explorer-table-node__column">
                                        <Text variant="caption-2">
                                            {column.column_name}
                                        </Text>

                                        <Text variant="caption-2" color="secondary">
                                            {column.data_type}
                                        </Text>
                                    </div>
                                ))}
                            </div>

                            <div className="explorer-table-node__meta">
                                <Text variant="caption-2" color="secondary">
                                    {details.columns.length} columns
                                </Text>

                                {details.indexes.length > 0 ? (
                                    <Text variant="caption-2" color="secondary">
                                        {details.indexes.length} indexes
                                    </Text>
                                ) : null}
                            </div>
                        </>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
