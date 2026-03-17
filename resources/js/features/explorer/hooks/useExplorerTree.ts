import type {ConnectionDto} from "../../../types/connection";
import type {ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import {useCallback, useEffect, useMemo, useState} from "react";
import {fetchSchemas, fetchTableDetails, fetchTables} from "../../../api/explorer";

const EXPLORER_TREE_STORAGE_KEY = 'web-db-ide-explorer-tree';

interface PersistedExplorerTreeState {
    expandedConnectionIds: number[];
    expandedSchemaKeys: string[];
    expandedTableKeys: string[];
}

function loadPersistedTreeState(): PersistedExplorerTreeState {
    if (typeof window === 'undefined') {
        return {
            expandedConnectionIds: [],
            expandedSchemaKeys: [],
            expandedTableKeys: [],
        };
    }

    try {
        const raw = window.localStorage.getItem(EXPLORER_TREE_STORAGE_KEY);

        if (!raw) {
            return {
                expandedConnectionIds: [],
                expandedSchemaKeys: [],
                expandedTableKeys: [],
            };
        }

        const parsed = JSON.parse(raw) as Partial<PersistedExplorerTreeState>;

        return {
            expandedConnectionIds: Array.isArray(parsed.expandedConnectionIds)
                ? parsed.expandedConnectionIds.filter((value): value is number => typeof value === 'number')
                : [],
            expandedSchemaKeys: Array.isArray(parsed.expandedSchemaKeys)
                ? parsed.expandedSchemaKeys.filter((value): value is string => typeof value === 'string')
                : [],
            expandedTableKeys: Array.isArray(parsed.expandedTableKeys)
                ? parsed.expandedTableKeys.filter((value): value is string => typeof value === 'string')
                : [],
        };
    } catch (error) {
        console.error(error);

        return {
            expandedConnectionIds: [],
            expandedSchemaKeys: [],
            expandedTableKeys: [],
        };
    }
}

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

    const persistedTreeState = useMemo(() => loadPersistedTreeState(), []);

    const [expandedConnectionIds, setExpandedConnectionIds] = useState<number[]>(
        persistedTreeState.expandedConnectionIds,
    );
    const [expandedSchemaKeys, setExpandedSchemaKeys] = useState<string[]>(
        persistedTreeState.expandedSchemaKeys,
    );
    const [expandedTableKeys, setExpandedTableKeys] = useState<string[]>(
        persistedTreeState.expandedTableKeys,
    );

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const payload: PersistedExplorerTreeState = {
            expandedConnectionIds,
            expandedSchemaKeys,
            expandedTableKeys,
        };

        window.localStorage.setItem(EXPLORER_TREE_STORAGE_KEY, JSON.stringify(payload));
    }, [expandedConnectionIds, expandedSchemaKeys, expandedTableKeys]);

    useEffect(() => {
        if (!activeConnectionId) {
            return;
        }

        setExpandedConnectionIds((prev) =>
            prev.includes(activeConnectionId)
                ? prev
                : [...prev, activeConnectionId],
        );
    }, [activeConnectionId]);

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

    const loadTables = useCallback(async (connectionId: number, schema: string) => {
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
    }, []);

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

    const toggleConnection = useCallback((connectionId: number) => {
        setExpandedConnectionIds((prev) =>
            prev.includes(connectionId)
                ? prev.filter((id) => id !== connectionId)
                : [...prev, connectionId],
        );

        onSelectConnection(connectionId);
    }, [onSelectConnection]);

    const toggleSchema = useCallback((connectionId: number, schema: string) => {
        const schemaKey = `${connectionId}:${schema}`;

        setExpandedSchemaKeys((prev) => {
            const isExpanded = prev.includes(schemaKey);

            if (isExpanded) {
                return prev.filter((key) => key !== schemaKey);
            }

            return [...prev, schemaKey];
        });

        if (!tablesBySchemaKey[schemaKey]) {
            void loadTables(connectionId, schema);
        }
    }, [loadTables, tablesBySchemaKey]);

    const toggleTable = useCallback((connectionId: number, schema: string, tableName: string) => {
        const tableKey = `${connectionId}:${schema}:${tableName}`;

        setExpandedTableKeys((prev) =>
            prev.includes(tableKey)
                ? prev.filter((key) => key !== tableKey)
                : [...prev, tableKey],
        );
    }, []);

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
