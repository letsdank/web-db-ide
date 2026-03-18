import type {ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import React from "react";
import {Button, ClipboardButton, DropdownMenu, Icon, Label, Loader, Text} from "@gravity-ui/uikit";
import {ChevronDown, ChevronRight, Ellipsis, LayoutHeaderCellsLargeFill} from "@gravity-ui/icons";
import {useI18n} from "../../../i18n";

interface Props {
    connectionId: number;
    schema: string;
    table: ExplorerTableDto;
    details?: ExplorerTableDetailsDto;
    isExpanded: boolean;
    isLoadingDetails: boolean;
    onToggle: () => void;
    onOpenContextMenu: (
        event: React.MouseEvent,
        payload: {
            connectionId: number;
            schema: string;
            table: ExplorerTableDto;
            details?: ExplorerTableDetailsDto;
        }
    ) => void;
    onOpenSelect: () => void;
    onOpenCount: () => void;
    onOpenMetadata: (details?: ExplorerTableDetailsDto) => void;
    onCopyFullName: () => void;
    onCopySelect: () => void;
    onExportDump: () => void;
}

export function ExplorerTableNode({
                                      connectionId,
                                      schema,
                                      table,
                                      isExpanded,
                                      details,
                                      isLoadingDetails,
                                      onToggle,
                                      onOpenContextMenu,
                                      onOpenSelect,
                                      onOpenCount,
                                      onOpenMetadata,
                                      onCopyFullName,
                                      onCopySelect,
                                      onExportDump,
                                  }: Props) {
    const {t} = useI18n();

    return (
        <div className="explorer-table-node">
            <div className="explorer-table-node__row">
                <button
                    type="button"
                    className="explorer-table-node__toggle"
                    onClick={onToggle}
                    onContextMenu={(event) => onOpenContextMenu(event, {
                        connectionId,
                        schema,
                        table,
                        details,
                    })}
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
                    <ClipboardButton
                        size="m"
                        text={table.table_name}
                        tooltipInitialText={t('explorer.copyTableName')}
                        tooltipSuccessText={t('explorer.copied')}
                    />

                    <DropdownMenu
                        items={[
                            {
                                text: t('explorer.exportTableDump'),
                                action: onExportDump,
                            },
                            {
                                text: t('explorer.openPreview'),
                                action: onOpenSelect,
                            },
                            {
                                text: t('explorer.countRows'),
                                action: onOpenCount,
                            },
                            {
                                text: t('explorer.copySelectToEditor'),
                                action: onCopySelect,
                            },
                            {
                                text: t('explorer.openMetadata'),
                                action: () => onOpenMetadata(details),
                            },
                            {
                                text: t('explorer.copyFullName'),
                                action: onCopyFullName,
                            },
                        ]}
                        renderSwitcher={({onClick, onKeyDown}) => (
                            <Button
                                size="s"
                                view="flat-secondary"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onClick?.(event);
                                }}
                                onKeyDown={onKeyDown}
                            >
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
}
