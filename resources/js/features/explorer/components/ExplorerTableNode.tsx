import type {ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import React, {useCallback} from "react";
import {Button, Icon, Label, Loader, Text} from "@gravity-ui/uikit";
import {ChevronDown, ChevronRight, Copy, Ellipsis, LayoutHeaderCellsLargeFill} from "@gravity-ui/icons";
import {useI18n} from "../../../i18n";

interface Props {
    connectionId: number;
    schema: string;
    table: ExplorerTableDto;
    details?: ExplorerTableDetailsDto;
    isExpanded: boolean;
    isLoadingDetails: boolean;
    canExportDump: boolean;
    onToggle: (schema: string, tableName: string) => void;
    onOpenContextMenu: (
        event: React.MouseEvent,
        payload: {
            connectionId: number;
            schema: string;
            table: ExplorerTableDto;
            details?: ExplorerTableDetailsDto;
        }
    ) => void;
    onOpenActionsMenu: (
        event: React.MouseEvent,
        payload: {
            connectionId: number;
            schema: string;
            table: ExplorerTableDto;
            details?: ExplorerTableDetailsDto;
        }
    ) => void;
}

export const ExplorerTableNode =
    React.memo(function ExplorerTableNode({
                                              connectionId,
                                              schema,
                                              table,
                                              isExpanded,
                                              details,
                                              isLoadingDetails,
                                              onToggle,
                                              onOpenContextMenu,
                                              onOpenActionsMenu,
                                          }: Props) {
        const {t} = useI18n();

        const handleToggle = useCallback(() => {
            onToggle(schema, table.table_name);
        }, [onToggle, schema, table.table_name]);

        const handleOpenContextMenu = useCallback((event: React.MouseEvent) => {
            onOpenContextMenu(event, {
                connectionId,
                schema,
                table,
                details,
            });
        }, [connectionId, details, onOpenContextMenu, schema, table]);

        const handleOpenActionsMenu = useCallback((event: React.MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();

            onOpenActionsMenu(event, {
                connectionId,
                schema,
                table,
                details,
            });
        }, [connectionId, details, onOpenActionsMenu, schema, table]);

        const handleCopyTableName = useCallback((event: React.MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();

            void navigator.clipboard.writeText(table.table_name);
        }, [table.table_name]);

        return (
            <div className="explorer-table-node">
                <div className="explorer-table-node__row">
                    <button
                        type="button"
                        className="explorer-table-node__toggle"
                        onClick={handleToggle}
                        onContextMenu={handleOpenContextMenu}
                    >
                        <span className="explorer-table-node__title-left">
                            <span className="explorer-table-node__chevron">
                                <Icon data={isExpanded ? ChevronDown : ChevronRight} size={14}/>
                            </span>

                            <span className="explorer-table-node__icon">
                                <Icon data={LayoutHeaderCellsLargeFill} size={14}/>
                            </span>

                            <span className="explorer-table-node__title-row">
                                <Text variant="body-2">{table.table_name}</Text>
                            </span>
                        </span>
                    </button>

                    <div className="explorer-table-node__actions">
                        <Button
                            size="s"
                            view="flat-secondary"
                            onClick={handleCopyTableName}
                            aria-label={t('explorer.copyTableName')}
                        >
                            <Icon data={Copy} size={16}/>
                        </Button>

                        <Button
                            size="s"
                            view="flat-secondary"
                            onClick={handleOpenActionsMenu}
                            aria-label="Table actions"
                        >
                            <Icon data={Ellipsis} size={16}/>
                        </Button>
                    </div>
                </div>

                {isExpanded ? (
                    <div className="explorer-table-node__details">
                        {isLoadingDetails ? (
                            <div className="explorer-table-node__loading">
                                <Loader size="s"/>
                                <Text variant="body-2" color="secondary">
                                    {t('explorer.loadingColumns')}
                                </Text>
                            </div>
                        ) : details ? (
                            <>
                                <div className="explorer-table-node__columns">
                                    {details.columns.map((column) => (
                                        <div key={column.column_name} className="explorer-table-node__column">
                                            <Text variant="caption-2">{column.column_name}</Text>

                                            <div className="explorer-table-node__column-meta">
                                                <Text variant="caption-2" color="secondary">
                                                    {column.data_type}
                                                </Text>

                                                {column.is_nullable === 'NO' ? (
                                                    <Label theme="warning">not null</Label>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="explorer-table-node__meta">
                                    <Label theme="unknown">
                                        {t('explorer.columnsCount', {count: details.columns.length})}
                                    </Label>

                                    {details.indexes.length > 0 ? (
                                        <Label theme="info">
                                            {t('explorer.indexesCount', {count: details.indexes.length})}
                                        </Label>
                                    ) : null}
                                </div>
                            </>
                        ) : null}
                    </div>
                ) : null}
            </div>
        );
    });
