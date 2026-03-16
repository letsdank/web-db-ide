import {ConnectionDto} from "../../../types/connection";
import {ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import React, {useMemo} from "react";
import {Button, DropdownMenu, Icon, Label, Loader, Text} from "@gravity-ui/uikit";
import {ExplorerSchemaNode} from "./ExplorerSchemaNode";
import {ChevronDown, ChevronRight, Database, Ellipsis} from "@gravity-ui/icons";
import {useI18n} from "../../../i18n";

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
    filter: string;
    onToggleConnection: () => void;
    onEditConnection: () => void;
    onDeleteConnection: () => void;
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
    onCopySelect: (schema: string, table: ExplorerTableDto) => void;
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
                                           filter,
                                           onToggleConnection,
                                           onEditConnection,
                                           onDeleteConnection,
                                           onToggleSchema,
                                           onToggleTable,
                                           onOpenTableContextMenu,
                                           onOpenSelect,
                                           onOpenCount,
                                           onOpenMetadata,
                                           onCopyFullName,
                                           onCopySelect,
                                       }: Props) {
    const {t} = useI18n();

    const visibleSchemas = useMemo(() => {
        if (!filter) {
            return schemas;
        }

        return schemas.filter((schema) => {
            const schemaKey = `${connection.id}:${schema}`;
            const schemaMatches = schema.toLowerCase().includes(filter);
            const tableMatches = (tablesBySchemaKey[schemaKey] ?? []).some((table) =>
                table.table_name.toLowerCase().includes(filter)
            );

            return schemaMatches || tableMatches;
        });
    }, [connection.id, filter, schemas, tablesBySchemaKey])

    const connectionClasses = [
        "explorer-connection-card",
        isActive ? "explorer-connection-card--active" : "",
        isExpanded ? "explorer-connection-card--expanded" : "",
    ].filter(Boolean).join(" ");

    return (
        <div className={connectionClasses}>
            <div className="explorer-connection-card__header">
                <button
                    onClick={onToggleConnection}
                    className="explorer-connection-card__header-toggle"
                    type="button"
                >
                    <div className="explorer-connection-card__header-main">
                        <div className="explorer-connection-card__header-icon">
                            <Icon data={Database} size={16}/>
                        </div>

                        <div className="explorer-connection-card__header-copy">
                            <div className="explorer-connection-card__header-row">
                                <Text variant="subheader-2">{connection.name}</Text>

                                <div className="explorer-connection-card__badges">
                                    <Label theme="utility">{connection.driver}</Label>

                                    {connection.is_read_only ? (
                                        <Label theme="warning">{t('connections.readOnly')}</Label>
                                    ) : null}

                                    {connection.use_ssh_tunnel ? (
                                        <Label theme="info">{t('connections.ssh')}</Label>
                                    ) : null}
                                </div>
                            </div>

                            <div className="explorer-connection-card__meta">
                                <Text variant="body-1" color="secondary">
                                    {connection.database_name} · {connection.host}:{connection.port}
                                </Text>
                            </div>
                        </div>
                    </div>

                    <span className="explorer-connection-card__chevron">
                        <Icon data={isExpanded ? ChevronDown : ChevronRight} size={16}/>
                    </span>
                </button>

                <div className="explorer-connection-card__actions">
                    <DropdownMenu
                        items={[
                            {
                                text: t('connections.editConnection'),
                                action: onEditConnection,
                            },
                            {
                                text: t('connections.deleteConnection'),
                                action: onDeleteConnection,
                                theme: 'danger',
                            },
                        ]}
                        renderSwitcher={(props) => (
                            <Button
                                {...props}
                                size="s"
                                view="flat-secondary"
                                onlyIcon
                                onClick={(event) => {
                                    event.stopPropagation();
                                    props.onClick?.(event);
                                }}
                            >
                                <Icon data={Ellipsis} size={16}/>
                            </Button>
                        )}
                    />
                </div>
            </div>

            {isExpanded ? (
                <div className="explorer-connection-card__body">
                    {loadingSchemas ? (
                        <div className="explorer-connection-card__loading">
                            <Loader size="m"/>
                            <Text variant="body-2" color="secondary">
                                {t('connections.loadingSchemas')}
                            </Text>
                        </div>
                    ) : visibleSchemas.length > 0 ? (
                        visibleSchemas.map((schema) => {
                            const schemaKey = `${connection.id}:${schema}`;

                            return (
                                <ExplorerSchemaNode
                                    key={schemaKey}
                                    connectionId={connection.id}
                                    schema={schema}
                                    filter={filter}
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
                                    onCopySelect={(table) => onCopySelect(schema, table)}
                                />
                            );
                        })
                    ) : (
                        <div className="explorer-connection-card__empty">
                            <Text variant="body-2" color="secondary">
                                {filter
                                    ? t('connections.noSchemasOrTableMatchFilter')
                                    : t('connections.noSchemasAvailable')}
                            </Text>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}
