import type {ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import React, {useMemo} from "react";
import {Button, DropdownMenu, Icon, Label, Loader, Text} from "@gravity-ui/uikit";
import {ExplorerTableNode} from "./ExplorerTableNode";
import {ChevronDown, ChevronRight, Ellipsis, Folder} from "@gravity-ui/icons";
import {useI18n} from "../../../i18n";
import type {DatabaseDriver} from "../../../types/connection";
import {getExplorerGroupLabelKey} from "../lib/driverPresentation";

interface Props {
    driver: DatabaseDriver;
    connectionId: number;
    schema: string;
    filter: string;
    isExpanded: boolean;
    tables: ExplorerTableDto[];
    loadingTables: boolean;
    expandedTableKeys: string[];
    detailsByTableKey: Record<string, ExplorerTableDetailsDto>;
    loadingDetailsFor: string | null;
    canExportDump: boolean;
    onToggleSchema: () => void;
    onToggleTable: (tableName: string) => void;
    onOpenTableContextMenu: (
        event: React.MouseEvent,
        payload: {
            connectionId: number;
            schema: string;
            table: ExplorerTableDto;
            details?: ExplorerTableDetailsDto;
        }
    ) => void;
    onOpenSelect: (table: ExplorerTableDto) => void;
    onOpenCount: (table: ExplorerTableDto) => void;
    onOpenMetadata: (table: ExplorerTableDto, details?: ExplorerTableDetailsDto) => void;
    onCopyFullName: (table: ExplorerTableDto) => void;
    onCopySelect: (table: ExplorerTableDto) => void;
    onExportSchemaDump: () => void;
    onExportTableDump: (table: ExplorerTableDto) => void;
    onQuickExportTableSchema: (table: ExplorerTableDto) => void;
    onQuickExportTableData: (table: ExplorerTableDto) => void;
}

export function ExplorerSchemaNode({
                                       driver,
                                       connectionId,
                                       schema,
                                       filter,
                                       isExpanded,
                                       tables,
                                       loadingTables,
                                       expandedTableKeys,
                                       detailsByTableKey,
                                       loadingDetailsFor,
                                       canExportDump,
                                       onToggleSchema,
                                       onToggleTable,
                                       onOpenTableContextMenu,
                                       onOpenSelect,
                                       onOpenCount,
                                       onOpenMetadata,
                                       onCopyFullName,
                                       onCopySelect,
                                       onExportSchemaDump,
                                       onExportTableDump,
                                       onQuickExportTableSchema,
                                       onQuickExportTableData,
                                   }: Props) {
    const {t} = useI18n();

    const visibleTables = useMemo(() => {
        if (!filter) {
            return tables;
        }

        return tables.filter((table) =>
            table.table_name.toLowerCase().includes(filter),
        );
    }, [filter, tables]);

    return (
        <div className="explorer-schema-node">
            <div className="explorer-schema-node__row">
                <button
                    type="button"
                    className="explorer-schema-node__toggle"
                    onClick={onToggleSchema}
                >
                    <span className="explorer-schema-node__left">
                        <span className="explorer-schema-node__chevron">
                            <Icon data={isExpanded ? ChevronDown : ChevronRight} size={14}/>
                        </span>

                        <span className="explorer-schema-node__icon">
                            <Icon data={Folder} size={14}/>
                        </span>

                        <Text variant="body-2">{schema}</Text>
                        <Label theme="info">{t(getExplorerGroupLabelKey(driver))}</Label>
                    </span>

                    <span className="explorer-schema-node__toggle-right">
                        <Label theme="unknown">{tables.length}</Label>
                    </span>
                </button>

                <div className="explorer-schema-node__actions">
                    <DropdownMenu
                        items={[
                            {
                                text: t('explorer.exportSchemaDump'),
                                action: onExportSchemaDump,
                                disabled: !canExportDump,
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
                <div className="explorer-schema-node__tables">
                    {loadingTables ? (
                        <div className="explorer-schema-node__loading">
                            <Loader size="s"/>
                            <Text variant="body-2" color="secondary">
                                {t('explorer.loadingTables')}
                            </Text>
                        </div>
                    ) : visibleTables.length > 0 ? (
                        visibleTables.map((table) => {
                            const tableKey = `${connectionId}:${schema}:${table.table_name}`;

                            return (
                                <ExplorerTableNode
                                    key={tableKey}
                                    connectionId={connectionId}
                                    schema={schema}
                                    table={table}
                                    isExpanded={expandedTableKeys.includes(tableKey)}
                                    details={detailsByTableKey[tableKey]}
                                    isLoadingDetails={loadingDetailsFor === tableKey}
                                    canExportDump={canExportDump}
                                    onToggle={() => onToggleTable(table.table_name)}
                                    onOpenContextMenu={onOpenTableContextMenu}
                                    onOpenSelect={() => onOpenSelect(table)}
                                    onOpenCount={() => onOpenCount(table)}
                                    onOpenMetadata={(details) => onOpenMetadata(table, details)}
                                    onCopyFullName={() => onCopyFullName(table)}
                                    onCopySelect={() => onCopySelect(table)}
                                    onExportDump={() => onExportTableDump(table)}
                                    onQuickExportSchema={() => onQuickExportTableSchema(table)}
                                    onQuickExportData={() => onQuickExportTableData(table)}
                                />
                            );
                        })
                    ) : (
                        <div className="explorer-schema-node__empty">
                            <Text variant="caption-2" color="secondary">
                                {t('explorer.noTables')}
                            </Text>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}
