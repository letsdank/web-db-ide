import {ConnectionDto} from "../../../types/connection";
import {ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import React from "react";
import {Label, Text} from "@gravity-ui/uikit";
import {ExplorerSchemaNode} from "./ExplorerSchemaNode";

interface Props {
    connection: ConnectionDto;
    isActive: boolean;
    isExpanded: boolean;
    schemas: string[];
    loadingSchemas: boolean;
    expandedSchemaKeys: string[];
    expandedTableKeys: string[];
    tablesBySchemaKey: Record<string, ExplorerTableDto[]>;
    detailsByTableKey: Record<string, ExplorerTableDetailsDto>;
    loadingTablesFor: string | null;
    loadingDetailsFor: string | null;
    onToggleConnection: () => void;
    onToggleSchema: (schema: string) => void;
    onToggleTable: (schema: string, tableName: string) => void;
    onOpenTableContextMenu: (
        event: React.MouseEvent,
        payload: {
            connectionId: number;
            schema: string;
            table: ExplorerTableDto;
            details?: ExplorerTableDetailsDto;
        }
    ) => void;
    onOpenSelect: (schema: string, table: ExplorerTableDto) => void;
    onOpenCount: (schema: string, table: ExplorerTableDto) => void;
    onOpenMetadata: (schema: string, table: ExplorerTableDto, details?: ExplorerTableDetailsDto) => void;
    onCopyFullName: (schema: string, table: ExplorerTableDto) => void;
}

export function ExplorerConnectionCard({
                                           connection,
                                           isActive,
                                           isExpanded,
                                           schemas,
                                           loadingSchemas,
                                           expandedSchemaKeys,
                                           expandedTableKeys,
                                           tablesBySchemaKey,
                                           detailsByTableKey,
                                           loadingTablesFor,
                                           loadingDetailsFor,
                                           onToggleConnection,
                                           onToggleSchema,
                                           onToggleTable,
                                           onOpenTableContextMenu,
                                           onOpenSelect,
                                           onOpenCount,
                                           onOpenMetadata,
                                           onCopyFullName,
                                       }: Props) {
    return (
        <div
            className={[
                "explorer-connection-card",
                isActive ? "explorer-connection-card--active" : "",
            ].filter(Boolean).join(" ")}
        >
            <button
                onClick={onToggleConnection}
                className="explorer-connection-card__header"
            >
                <div className="explorer-connection-card__header-row">
                    <Text variant="subheader-2">{connection.name}</Text>
                    <Label theme="utility">{connection.driver}</Label>
                </div>

                <div className="explorer-connection-card__meta">
                    <Text variant="body-1" color="secondary">
                        {connection.database_name} · {connection.host}:{connection.port}
                    </Text>
                </div>
            </button>

            {isExpanded ? (
                <div className="explorer-connection-card__body">
                    {loadingSchemas ? (
                        <Text variant="body-2" color="secondary">
                            Loading schemas...
                        </Text>
                    ) : schemas.length > 0 ? (
                        schemas.map((schema) => {
                            const schemaKey = `${connection.id}:${schema}`;

                            return (
                                <ExplorerSchemaNode
                                    key={schemaKey}
                                    connectionId={connection.id}
                                    schema={schema}
                                    isExpanded={expandedSchemaKeys.includes(schemaKey)}
                                    tables={tablesBySchemaKey[schemaKey] ?? []}
                                    loadingTables={loadingTablesFor === schemaKey}
                                    expandedTableKeys={expandedTableKeys}
                                    detailsByTableKey={detailsByTableKey}
                                    loadingDetailsFor={loadingDetailsFor}
                                    onToggleSchema={() => onToggleSchema(schema)}
                                    onToggleTable={(tableName) => onToggleTable(schema, tableName)}
                                    onOpenTableContextMenu={onOpenTableContextMenu}
                                    onOpenSelect={(table) => onOpenSelect(schema, table)}
                                    onOpenCount={(table) => onOpenCount(schema, table)}
                                    onOpenMetadata={(table, details) => onOpenMetadata(schema, table, details)}
                                    onCopyFullName={(table) => onCopyFullName(schema, table)}
                                />
                            );
                        })
                    ) : (
                        <Text variant="body-2" color="secondary">
                            No schemas available.
                        </Text>
                    )}
                </div>
            ) : null}
        </div>
    );
}
