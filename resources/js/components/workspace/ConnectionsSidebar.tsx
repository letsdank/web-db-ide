import {ConnectionDto} from "../../types/connection";
import {Button, Card, Label, Text} from "@gravity-ui/uikit";
import {useEffect, useMemo, useState} from "react";
import {ExplorerTableDetailsDto, ExplorerTableDto} from "../../types/explorer";
import {fetchSchemas, fetchTableDetails, fetchTables} from "../../api/explorer";

interface Props {
    connections: ConnectionDto[];
    activeConnectionId: number | null;
    onSelect: (id: number) => void;
    onCreateClick: () => void;
    onOpenSql: (payload: {
        title: string,
        sql_text: string,
        db_connection_id: number | null;
    }) => void;
}

export function ConnectionsSidebar({
                                       connections,
                                       activeConnectionId,
                                       onSelect,
                                       onCreateClick,
                                       onOpenSql,
                                   }: Props) {
    const [schemasByConnectionId, setSchemasByConnectionId] = useState<Record<number, string[]>>({});
    const [tablesBySchemaKey, setTablesBySchemaKey] = useState<Record<string, ExplorerTableDto[]>>({});
    const [detailsByTableKey, setDetailsByTableKey] = useState<Record<string, ExplorerTableDetailsDto>>({});

    const [expandedConnectionIds, setExpandedConnectionIds] = useState<number[]>([]);
    const [expandedSchemaKeys, setExpandedSchemaKeys] = useState<string[]>([]);
    const [expandedTableKeys, setExpandedTableKeys] = useState<string[]>([]);

    const [loadingSchemasFor, setLoadingSchemasFor] = useState<number | null>(null);
    const [loadingTablesFor, setLoadingTablesFor] = useState<string | null>(null);
    const [loadingDetailsFor, setLoadingDetailsFor] = useState<string | null>(null);

    const activeConnection = useMemo(
        () => connections.find((connection) => connection.id === activeConnectionId) ?? null,
        [connections, activeConnectionId],
    );

    useEffect(() => {
        if (!activeConnectionId) {
            return;
        }

        setExpandedConnectionIds((prev) =>
            prev.includes(activeConnectionId) ? prev : [...prev, activeConnectionId],
        );

        if (schemasByConnectionId[activeConnectionId]) {
            return;
        }

        void loadSchemas(activeConnectionId);
    }, [activeConnectionId]);

    async function loadSchemas(connectionId: number) {
        setLoadingSchemasFor(connectionId);

        try {
            const schemas = await fetchSchemas(connectionId);

            setSchemasByConnectionId((prev) => ({
                ...prev,
                [connectionId]: schemas,
            }));
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingSchemasFor((current) => (current === connectionId ? null : current));
        }
    }

    async function loadTables(connectionId: number, schema: string) {
        const key = `${connectionId}:${schema}`;

        setLoadingTablesFor(key);

        try {
            const tables = await fetchTables(connectionId, schema);

            setTablesBySchemaKey((prev) => ({
                ...prev,
                [key]: tables,
            }));
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingTablesFor((current) => (current === key ? null : current));
        }
    }

    async function loadTableDetails(connectionId: number, schema: string, table: string) {
        const key = `${connectionId}:${schema}:${table}`;

        setLoadingDetailsFor(key);

        try {
            const details = await fetchTableDetails(connectionId, schema, table);

            setDetailsByTableKey((prev) => ({
                ...prev,
                [key]: details,
            }));
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingDetailsFor((current) => (current === key ? null : current));
        }
    }

    async function handleToggleConnection(connectionId: number) {
        onSelect(connectionId);

        const isExpanded = expandedConnectionIds.includes(connectionId);

        setExpandedConnectionIds((prev) =>
            isExpanded ? prev.filter((id) => id !== connectionId) : [...prev, connectionId],
        );

        if (!isExpanded && !schemasByConnectionId[connectionId]) {
            await loadSchemas(connectionId);
        }
    }

    async function handleToggleSchema(connectionId: number, schema: string) {
        const key = `${connectionId}:${schema}`;
        const isExpanded = expandedSchemaKeys.includes(key);

        setExpandedSchemaKeys((prev) =>
            isExpanded ? prev.filter((item) => item !== key) : [...prev, key],
        );

        if (!isExpanded && !tablesBySchemaKey[key]) {
            await loadTables(connectionId, schema);
        }
    }

    async function handleToggleTable(connectionId: number, schema: string, table: string) {
        const key = `${connectionId}:${schema}:${table}`;
        const isExpanded = expandedTableKeys.includes(key);

        setExpandedTableKeys((prev) =>
            isExpanded ? prev.filter((item) => item !== key) : [...prev, key],
        );

        if (!isExpanded && !detailsByTableKey[key]) {
            await loadTableDetails(connectionId, schema, table);
        }
    }

    function buildSelectSql(schema: string, table: string) {
        return `SELECT *\nFROM "${schema}"."${table}"\nLIMIT 100;`;
    }

    function buildCountSql(schema: string, table: string) {
        return `SELECT COUNT(*) AS total_rows\nFROM "${schema}"."${table}";`;
    }

    function buildDescribeSql(details: ExplorerTableDetailsDto) {
        const lines = details.columns.map((column) => {
            const nullable = column.is_nullable === 'YES' ? 'NULL': 'NOT NULL';
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

    return (
        <Card
            view="filled"
            style={{
                height: '100%',
                padding: 12,
                overflow: 'auto',
                boxSizing: 'border-box',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 12,
                }}
            >
                <Text variant="header-1">Explorer</Text>

                <Button view="action" size="m" onClick={onCreateClick}>
                    New
                </Button>
            </div>

            <div style={{display: 'grid', gap: 10}}>
                {connections.map((connection) => {
                    const isActive = connection.id === activeConnectionId;
                    const isExpanded = expandedConnectionIds.includes(connection.id);
                    const schemas = schemasByConnectionId[connection.id] ?? [];

                    return (
                        <div
                            key={connection.id}
                            style={{
                                border: '1px solid var(--g-color-line-generic)',
                                borderRadius: 12,
                                background: isActive
                                    ? 'var(--g-color-base-selection)'
                                    : 'var(--g-color-base-float)',
                                overflow: 'hidden',
                            }}
                        >
                            <button
                                onClick={() => handleToggleConnection(connection.id)}
                                style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    border: 'none',
                                    background: 'transparent',
                                    padding: 12,
                                    cursor: 'pointer',
                                    color: 'inherit',
                                }}
                            >
                                <div style={{display: 'flex', justifyContent: 'space-between', gap: 8}}>
                                    <Text variant="subheader-2">{connection.name}</Text>
                                    <Label theme="utility">{connection.driver}</Label>
                                </div>

                                <div style={{marginTop: 4}}>
                                    <Text variant="body-1" color="secondary">
                                        {connection.database_name} · {connection.host}:{connection.port}
                                    </Text>
                                </div>
                            </button>

                            {isExpanded ? (
                                <div
                                    style={{
                                        borderTop: '1px solid var(--g-color-line-generic)',
                                        padding: 10,
                                        display: 'grid',
                                        gap: 8,
                                    }}
                                >
                                    {loadingSchemasFor === connection.id ? (
                                        <Text variant="body-2" color="secondary">
                                            Loading schemas...
                                        </Text>
                                    ) : schemas.length > 0 ? (
                                        schemas.map((schema) => {
                                            const schemaKey = `${connection.id}:${schema}`;
                                            const isSchemaExpanded = expandedSchemaKeys.includes(schemaKey);
                                            const tables = tablesBySchemaKey[schemaKey] ?? [];

                                            return (
                                                <div key={schemaKey}>
                                                    <button
                                                        onClick={() => handleToggleSchema(connection.id, schema)}
                                                        style={{
                                                            width: '100%',
                                                            textAlign: 'left',
                                                            border: 'none',
                                                            background: 'transparent',
                                                            padding: '6px 4px',
                                                            cursor: 'pointer',
                                                            color: 'inherit',
                                                        }}
                                                    >
                                                        <Text variant="body-2">{schema}</Text>
                                                    </button>

                                                    {isSchemaExpanded ? (
                                                        <div style={{paddingLeft: 12, display: 'grid', gap: 6}}>
                                                            {loadingTablesFor === schemaKey ? (
                                                                <Text variant="body-2" color="secondary">
                                                                    Loading tables...
                                                                </Text>
                                                            ) : tables.length > 0 ? (
                                                                tables.map((table) => {
                                                                    const tableKey = `${connection.id}:${schema}:${table.table_name}`;
                                                                    const isTableExpanded = expandedTableKeys.includes(tableKey);
                                                                    const details = detailsByTableKey[tableKey];

                                                                    return (
                                                                        <div key={tableKey}>
                                                                            <button
                                                                                onClick={() => handleToggleTable(connection.id, schema, table.table_name)}
                                                                                style={{
                                                                                    width: '100%',
                                                                                    textAlign: 'left',
                                                                                    border: 'none',
                                                                                    background: 'transparent',
                                                                                    padding: '4px 4px',
                                                                                    cursor: 'pointer',
                                                                                    color: 'inherit',
                                                                                }}
                                                                            >
                                                                                <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                                                                                    <Text variant="body-2">
                                                                                        {table.table_name}
                                                                                    </Text>
                                                                                    <Label theme="unknown">
                                                                                        {table.table_type}
                                                                                    </Label>
                                                                                </div>
                                                                            </button>

                                                                            {isTableExpanded ? (
                                                                                <div
                                                                                    style={{
                                                                                        paddingLeft: 12,
                                                                                        paddingTop: 6,
                                                                                        display: 'grid',
                                                                                        gap: 8,
                                                                                    }}
                                                                                >
                                                                                    <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
                                                                                        <Button
                                                                                            size="s"
                                                                                            view="outlined"
                                                                                            onClick={() =>
                                                                                                onOpenSql({
                                                                                                    title: `${schema}.${table.table_name}`,
                                                                                                    sql_text: buildSelectSql(schema, table.table_name),
                                                                                                    db_connection_id: connection.id,
                                                                                                })
                                                                                            }
                                                                                        >
                                                                                            SELECT *
                                                                                        </Button>

                                                                                        <Button
                                                                                            size="s"
                                                                                            view="outlined"
                                                                                            onClick={() =>
                                                                                                onOpenSql({
                                                                                                    title: `${schema}.${table.table_name} count`,
                                                                                                    sql_text: buildCountSql(schema, table.table_name),
                                                                                                    db_connection_id: connection.id,
                                                                                                })
                                                                                            }
                                                                                        >
                                                                                            COUNT(*)
                                                                                        </Button>
                                                                                    </div>

                                                                                    {loadingDetailsFor === tableKey ? (
                                                                                        <Text variant="body-2" color="secondary">
                                                                                            Loading columns...
                                                                                        </Text>
                                                                                    ) : details ? (
                                                                                        <>
                                                                                            <div style={{display: 'grid', gap: 4}}>
                                                                                                {details.columns.map((column) => (
                                                                                                    <div key={column.column_name}>
                                                                                                        <Text variant="caption-2" color="secondary">
                                                                                                            {column.column_name} · {column.data_type}
                                                                                                        </Text>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>

                                                                                            <Button
                                                                                                size="s"
                                                                                                view="flat"
                                                                                                onClick={() =>
                                                                                                    onOpenSql({
                                                                                                        title: `${schema}.${table.table_name} meta`,
                                                                                                        sql_text: buildDescribeSql(details),
                                                                                                        db_connection_id: connection.id,
                                                                                                    })
                                                                                                }
                                                                                            >
                                                                                                Open metadata tab
                                                                                            </Button>
                                                                                        </>
                                                                                    ) : null}
                                                                                </div>
                                                                            ) : null}
                                                                        </div>
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
                })}

                {!activeConnection && connections.length === 0 ? (
                    <Text variant="body-2" color="secondary">
                        No connections yet. Create one to start browsing the database.
                    </Text>
                ) : null}
            </div>
        </Card>
    );
}
