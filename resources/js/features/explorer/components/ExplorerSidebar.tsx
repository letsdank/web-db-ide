import {ConnectionDto} from "../../../types/connection";
import {ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import {useContextMenu} from "../../../hooks/useContextMenu";
import {ExplorerTableContextPayload, useExplorerTree} from "../hooks/useExplorerTree";
import {Button, Card, Text} from "@gravity-ui/uikit";
import {WorkspaceContextMenu} from "../../../components/workspace/WorkspaceContextMenu";
import {ExplorerConnectionCard} from "./ExplorerConnectionCard";

interface Props {
    connections: ConnectionDto[];
    activeConnectionId: number | null;
    onSelect: (id: number | null) => void;
    onCreateClick: () => void;
    onOpenSql: (payload: {
        title: string;
        sql_text: string;
        db_connection_id: number | null;
    }) => void;
}

function buildSelectSql(schema: string, table: string) {
    return `SELECT *\nFROM "${schema}"."${table}" LIMIT 100;`;
}

function buildCountSql(schema: string, table: string) {
    return `SELECT COUNT(*) AS total_rows\nFROM "${schema}"."${table}";`;
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
                                    onOpenSql,
                                }: Props) {
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
                                text: 'Select top 100',
                                onClick: () =>
                                    onOpenSql({
                                        title: `${contextTable.schema}.${contextTable.table.table_name}`,
                                        sql_text: buildSelectSql(contextTable.schema, contextTable.table.table_name),
                                        db_connection_id: contextTable.connectionId,
                                    }),
                            },
                            {
                                key: 'count',
                                text: 'Count rows',
                                onClick: () =>
                                    onOpenSql({
                                        title: `${contextTable.schema}.${contextTable.table.table_name} count`,
                                        sql_text: buildCountSql(contextTable?.schema, contextTable.table.table_name),
                                        db_connection_id: contextTable.connectionId,
                                    }),
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
                <Text variant="header-1">Explorer</Text>

                <Button view="action" size="m" onClick={onCreateClick}>
                    New
                </Button>
            </div>

            <div className="explorer-sidebar__list">
                {connections.map((connection) => (
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
                        onToggleConnection={() => toggleConnection(connection.id)}
                        onToggleSchema={(schema) => toggleSchema(connection.id, schema)}
                        onToggleTable={(schema, tableName) => toggleTable(connection.id, schema, tableName)}
                        onOpenTableContextMenu={openTableContextMenu}
                        onOpenSelect={(schema, table) =>
                            onOpenSql({
                                title: `${schema}.${table.table_name}`,
                                sql_text: buildSelectSql(schema, table.table_name),
                                db_connection_id: connection.id,
                            })
                        }
                        onOpenCount={(schema, table) =>
                            onOpenSql({
                                title: `${schema}.${table.table_name} count`,
                                sql_text: buildCountSql(schema, table.table_name),
                                db_connection_id: connection.id,
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

                {!activeConnection && connections.length === 0 ? (
                    <Text variant="body-2" color="secondary">
                        No connections yet. Create one to start browsing the database.
                    </Text>
                ) : null}
            </div>
        </Card>
    );
}
