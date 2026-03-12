import {ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import React from "react";
import {Text} from "@gravity-ui/uikit";
import {ExplorerTableNode} from "./ExplorerTableNode";

interface Props {
    connectionId: number;
    schema: string;
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
    return (
        <div>
            <button
                onClick={onToggleSchema}
                className="explorer-schema-node__toggle"
            >
                <Text variant="body-2">{schema}</Text>
            </button>

            {isExpanded ? (
                <div className="explorer-schema-node__tables">
                    {loadingTables ? (
                        <Text variant="body-2" color="secondary">
                            Loading tables...
                        </Text>
                    ) : tables.length > 0 ? (
                        tables.map((table) => {
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
                        <Text variant="body-2" color="secondary">
                            No tables in schema.
                        </Text>
                    )}
                </div>
            ) : null}
        </div>
    );
}
