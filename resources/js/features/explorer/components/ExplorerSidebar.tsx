import {ConnectionDto} from "../../../types/connection";
import {ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import {useContextMenu} from "../../../hooks/useContextMenu";
import {ExplorerTableContextPayload, useExplorerTree} from "../hooks/useExplorerTree";
import {Button, Card, Icon, Text, TextInput} from "@gravity-ui/uikit";
import {WorkspaceContextMenu} from "../../../components/workspace/WorkspaceContextMenu";
import {ExplorerConnectionCard} from "./ExplorerConnectionCard";
import {useMemo, useState} from "react";
import {CirclePlus, Magnifier} from "@gravity-ui/icons";

interface Props {
    connections: ConnectionDto[];
    activeConnectionId: number | null;
    onSelect: (id: number | null) => void;
    onCreateClick: () => void;
    onEditClick: (connection: ConnectionDto) => void;
    onDeleteClick: (connection: ConnectionDto) => void;
    onOpenSql: (payload: {
        title: string;
        sql_text: string;
        db_connection_id: number | null;
    }) => void;

    onOpenTablePreview: (payload: {
        connectionId: number;
        schema: string | null;
        table: string;
    }) => void;
    onOpenTableCount: (payload: {
        connectionId: number;
        schema: string | null;
        table: string;
    }) => void;
    onCopyTableSelect: (payload: {
        connectionId: number;
        schema: string | null;
        table: string;
    }) => void;
}

function buildDescribeSql(details: ExplorerTableDetailsDto) {
    const lines = details.columns.map((column) => {
        const nullable = column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultValue = column.column_default ? ` DEFAULT ${column.column_default}` : '';

        return `-- ${column.column_name}: ${column.data_type} ${nullable}${defaultValue}`;
    });

    return [
        `-- Table: "${details.schema}"."${details.table}"`,
        `-- Columns: ${details.columns.length}`,
        `-- Indexes: ${details.indexes.length}`,
        '',
        ...lines,
    ].join('\n');
}

export function ExplorerSidebar({
                                    connections,
                                    activeConnectionId,
                                    onSelect,
                                    onCreateClick,
                                    onEditClick,
                                    onDeleteClick,
                                    onOpenSql,
                                    onOpenTablePreview,
                                    onOpenTableCount,
                                    onCopyTableSelect,
                                }: Props) {
    const [filter, setFilter] = useState('');

    const {
        state: tableMenuState,
        anchorRef: tableMenuAnchorRef,
        anchorStyle: tableMenuAnchorStyle,
        openContextMenu: openTableContextMenu,
        closeContextMenu: closeTableContextMenu,
    } = useContextMenu<ExplorerTableContextPayload>();

    const {
        activeConnection,
        schemasByConnectionId,
        tablesBySchemaKey,
        detailsByTableKey,
        expandedConnectionIds,
        expandedSchemaKeys,
        expandedTableKeys,
        loadingSchemasFor,
        loadingTablesFor,
        loadingDetailsFor,
        toggleConnection,
        toggleSchema,
        toggleTable,
        loadTableDetails,
    } = useExplorerTree({
        connections,
        activeConnectionId,
        onSelectConnection: onSelect,
    });

    const normalizedFilter = filter.trim().toLowerCase();

    const visibleConnections = useMemo(() => {
        if (!normalizedFilter) {
            return connections;
        }

        return connections.filter((connection) => {
            const haystack = [
                connection.name,
                connection.driver,
                connection.host,
                connection.database_name,
                connection.username,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(normalizedFilter);
        });
    }, [connections, normalizedFilter]);

    async function openMetadata(
        connectionId: number,
        schema: string,
        table: ExplorerTableDto,
        details?: ExplorerTableDetailsDto,
    ) {
        const resolved =
            details ??
            await loadTableDetails(connectionId, schema, table.table_name);

        if (!resolved) {
            return;
        }

        onOpenSql({
            title: `${schema}.${table.table_name} meta`,
            sql_text: buildDescribeSql(resolved),
            db_connection_id: connectionId,
        });
    }

    async function copyFullName(schema: string, table: string) {
        try {
            await navigator.clipboard.writeText(`"${schema}"."${table}"`);
        } catch (error) {
            console.error(error);
        }
    }

    const contextTable = tableMenuState.payload;

    return (
        <Card
            view="filled"
            className="workspace-card workspace-card--scroll explorer-sidebar"
        >
            <div ref={tableMenuAnchorRef} style={tableMenuAnchorStyle}/>

            <WorkspaceContextMenu
                open={tableMenuState.open}
                anchorElement={tableMenuAnchorRef.current}
                onClose={closeTableContextMenu}
                actions={
                    contextTable
                        ? [
                            {
                                key: 'select-top',
                                text: 'Open preview',
                                onClick: () =>
                                    onOpenTablePreview({
                                        connectionId: contextTable.connectionId,
                                        schema: contextTable.schema,
                                        table: contextTable.table.table_name,
                                    }),
                            },
                            {
                                key: 'count',
                                text: 'Count rows',
                                onClick: () =>
                                    onOpenTableCount({
                                        connectionId: contextTable.connectionId,
                                        schema: contextTable.schema,
                                        table: contextTable.table.table_name,
                                    })
                            },
                            {
                                key: 'metadata',
                                text: 'Open metadata',
                                onClick: () =>
                                    openMetadata(
                                        contextTable.connectionId,
                                        contextTable.schema,
                                        contextTable.table,
                                        contextTable.details,
                                    ),
                            },
                            {
                                key: 'copy-select',
                                text: 'Copy SELECT to editor',
                                onClick: () =>
                                    onCopyTableSelect({
                                        connectionId: contextTable.connectionId,
                                        schema: contextTable.schema,
                                        table: contextTable.table.table_name,
                                    }),
                            },
                            {
                                key: 'separator-1',
                            },
                            {
                                key: 'copy',
                                text: 'Copy full name',
                                onClick: () =>
                                    copyFullName(
                                        contextTable.schema,
                                        contextTable.table.table_name,
                                    ),
                            },
                        ]
                        : []
                }
            />

            <div className="explorer-sidebar__header">
                <div className="explorer-sidebar__header-copy">
                    <Text variant="header-1">Explorer</Text>
                    <Text variant="body-2" color="secondary">
                        Connections, schemas and tables
                    </Text>
                </div>

                <Button view="action" size="m" onClick={onCreateClick}>
                    <Icon data={CirclePlus} size={16}/>
                    New
                </Button>
            </div>

            <div className="explorer-sidebar__search">
                <TextInput
                    size="l"
                    value={filter}
                    placeholder="Filter connections"
                    onUpdate={setFilter}
                    startContent={<Icon data={Magnifier} size={16}/>}
                />
            </div>

            <div className="explorer-sidebar__list">
                {visibleConnections.map((connection) => (
                    <ExplorerConnectionCard
                        key={connection.id}
                        connection={connection}
                        isActive={connection.id === activeConnectionId}
                        isExpanded={expandedConnectionIds.includes(connection.id)}
                        schemas={schemasByConnectionId[connection.id] ?? []}
                        loadingSchemas={loadingSchemasFor === connection.id}
                        expandedSchemaKeys={expandedSchemaKeys}
                        expandedTableKeys={expandedTableKeys}
                        tablesBySchemaKey={tablesBySchemaKey}
                        detailsByTableKey={detailsByTableKey}
                        loadingTablesFor={loadingTablesFor}
                        loadingDetailsFor={loadingDetailsFor}
                        filter={normalizedFilter}
                        onToggleConnection={() => toggleConnection(connection.id)}
                        onEditConnection={() => onEditClick(connection)}
                        onDeleteConnection={() => onDeleteClick(connection)}
                        onToggleSchema={(schema) => toggleSchema(connection.id, schema)}
                        onToggleTable={(schema, tableName) => toggleTable(connection.id, schema, tableName)}
                        onOpenTableContextMenu={openTableContextMenu}
                        onOpenSelect={(schema, table) =>
                            onOpenTablePreview({
                                connectionId: connection.id,
                                schema,
                                table: table.table_name,
                            })
                        }
                        onOpenCount={(schema, table) =>
                            onOpenTableCount({
                                connectionId: connection.id,
                                schema,
                                table: table.table_name,
                            })
                        }
                        onCopySelect={(schema, table) =>
                            onCopyTableSelect({
                                connectionId: connection.id,
                                schema,
                                table: table.table_name,
                            })
                        }
                        onOpenMetadata={(schema, table, details) =>
                            openMetadata(connection.id, schema, table, details)
                        }
                        onCopyFullName={(schema, table) =>
                            copyFullName(schema, table.table_name)
                        }
                    />
                ))}

                {connections.length === 0 ? (
                    <div className="explorer-sidebar__empty">
                        <Text variant="body-2" color="secondary">
                            No connections yet. Create one to start browsing the database.
                        </Text>
                    </div>
                ) : null}

                {connections.length > 0 && visibleConnections.length === 0 ? (
                    <div className="explorer-sidebar__empty">
                        <Text variant="body-2" color="secondary">
                            Nothing matches the current filter.
                        </Text>
                    </div>
                ) : null}

                {!activeConnection && connections.length > 0 ? (
                    <div className="explorer-sidebar__hint">
                        <Text variant="caption-2" color="secondary">
                            Select a connection to load schemas.
                        </Text>
                    </div>
                ) : null}
            </div>
        </Card>
    );
}
