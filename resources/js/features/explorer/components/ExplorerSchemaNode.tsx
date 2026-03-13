import {ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import React, {useMemo} from "react";
import {Button, Icon, Loader, Text} from "@gravity-ui/uikit";
import {ExplorerTableNode} from "./ExplorerTableNode";
import {ChevronDown, ChevronRight, Folder} from "@gravity-ui/icons";

interface Props {
    connectionId: number;
    schema: string;
    filter: string;
    isExpanded: boolean;
    tables: ExplorerTableDto[];
    loadingTables: boolean;
    expandedTableKeys: string[];
    detailsByTableKey: Record<string, ExplorerTableDetailsDto>;
    loadingDetailsFor: string | null;
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
}

export function ExplorerSchemaNode({
                                       connectionId,
                                       schema,
                                       filter,
                                       isExpanded,
                                       tables,
                                       loadingTables,
                                       expandedTableKeys,
                                       detailsByTableKey,
                                       loadingDetailsFor,
                                       onToggleSchema,
                                       onToggleTable,
                                       onOpenTableContextMenu,
                                       onOpenSelect,
                                       onOpenCount,
                                       onOpenMetadata,
                                       onCopyFullName,
                                   }: Props) {
    const visibleTables = useMemo(() => {
        if (!filter) {
            return tables;
        }

        return tables.filter((table) =>
            table.table_name.toLowerCase().includes(filter)
        );
    }, [filter, tables]);

    return (
        <div className="explorer-schema-node">
            <button
                onClick={onToggleSchema}
                className="explorer-schema-node__toggle"
                type="button"
            >
                <div className="explorer-schema-node__toggle-left">
                    <Icon data={Folder} size={14}/>
                    <Text variant="body-2">{schema}</Text>
                </div>

                <div className="explorer-schema-node__toggle-right">
                    {!loadingTables && tables.length > 0 ? (
                        <Text variant="caption-2" color="secondary">
                            {visibleTables.length}/{tables.length}
                        </Text>
                    ) : null}

                    <Button
                        size="s"
                        view="flat-secondary"
                        onlyIcon
                        tabIndex={-1}
                    >
                        <Icon data={isExpanded ? ChevronDown : ChevronRight} size={16}/>
                    </Button>
                </div>
            </button>

            {isExpanded ? (
                <div className="explorer-schema-node__tables">
                    {loadingTables ? (
                        <div className="explorer-schema-node__loading">
                            <Loader size="s"/>
                            <Text variant="body-2" color="secondary">
                                Loading tables...
                            </Text>
                        </div>
                    ) : visibleTables.length > 0 ? (
                        visibleTables.map((table) => {
                            const tableKey = `${connectionId}:${schema}:${table.table_name}`;
                            const isTableExpanded = expandedTableKeys.includes(tableKey);
                            const details = detailsByTableKey[tableKey];

                            return (
                                <ExplorerTableNode
                                    key={tableKey}
                                    connectionId={connectionId}
                                    schema={schema}
                                    table={table}
                                    details={details}
                                    isExpanded={isTableExpanded}
                                    isLoadingDetails={loadingDetailsFor === tableKey}
                                    onToggle={() => onToggleTable(table.table_name)}
                                    onOpenContextMenu={(event) =>
                                        onOpenTableContextMenu(event, {
                                            connectionId,
                                            schema,
                                            table,
                                            details,
                                        })
                                    }
                                    onOpenSelect={() => onOpenSelect(table)}
                                    onOpenCount={() => onOpenCount(table)}
                                    onOpenMetadata={() => onOpenMetadata(table, details)}
                                    onCopyFullName={() => onCopyFullName(table)}
                                />
                            );
                        })
                    ) : (
                        <div className="explorer-schema-node__empty">
                            <Text variant="caption-2" color="secondary">
                                No tables in schema.
                            </Text>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}
