import {ConnectionDto} from "../../../types/connection";
import {ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import {useEffect, useMemo, useState} from "react";
import {fetchSchemas, fetchTableDetails, fetchTables} from "../../../api/explorer";

interface UseExplorerTreeParams {
    connections: ConnectionDto[];
    activeConnectionId: number | null;
    onSelectConnection: (id: number | null) => void;
}

export interface ExplorerTableContextPayload {
    connectionId: number;
    schema: string;
    table: ExplorerTableDto;
    details?: ExplorerTableDetailsDto;
}

export function useExplorerTree({
                                    connections,
                                    activeConnectionId,
                                    onSelectConnection,
                                }: UseExplorerTreeParams) {
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
    }, [activeConnectionId, schemasByConnectionId]);

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

            return details;
        } catch (error) {
            console.error(error);
            return null;
        } finally {
            setLoadingDetailsFor((current) => (current === key ? null : current));
        }
    }

    async function toggleConnection(connectionId: number) {
        onSelectConnection(connectionId);

        const isExpanded = expandedConnectionIds.includes(connectionId);

        setExpandedConnectionIds((prev) =>
            isExpanded ? prev.filter((id) => id !== connectionId) : [...prev, connectionId],
        );

        if (!isExpanded && !schemasByConnectionId[connectionId]) {
            await loadSchemas(connectionId);
        }
    }

    async function toggleSchema(connectionId: number, schema: string) {
        const key = `${connectionId}:${schema}`;
        const isExpanded = expandedSchemaKeys.includes(key);

        setExpandedSchemaKeys((prev) =>
            isExpanded ? prev.filter((item) => item !== key) : [...prev, key],
        );

        if (!isExpanded && !tablesBySchemaKey[key]) {
            await loadTables(connectionId, schema);
        }
    }

    async function toggleTable(connectionId: number, schema: string, table: string) {
        const key = `${connectionId}:${schema}:${table}`;
        const isExpanded = expandedTableKeys.includes(key);

        setExpandedTableKeys((prev) =>
            isExpanded ? prev.filter((item) => item !== key) : [...prev, key],
        );

        if (!isExpanded && !detailsByTableKey[key]) {
            await loadTableDetails(connectionId, schema, table);
        }
    }

    return {
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
    };
}
