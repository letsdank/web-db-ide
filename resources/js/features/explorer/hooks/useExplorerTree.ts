import type {ConnectionDto} from "../../../types/connection";
import type {ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
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

/**
 * Manages the explorer sidebar tree state: loading schemas/tables/details,
 * expand/collapse, and persistence to localStorage.
 *
 * Restored state from localStorage triggers lazy data loads on mount
 * so the tree looks the same after a page reload.
 */
export function useExplorerTree({
                                    connections,
                                    activeConnectionId,
                                    onSelectConnection,
                                }: UseExplorerTreeParams) {
    const [schemasByConnectionId, setSchemasByConnectionId] = useState<Record<number, string[]>>({});
    const [tablesBySchemaKey, setTablesBySchemaKey] = useState<Record<string, ExplorerTableDto[]>>({});
    const [detailsByTableKey, setDetailsByTableKey] = useState<Record<string, ExplorerTableDetailsDto>>({});

    const [loadingSchemasFor, setLoadingSchemasFor] = useState<number | null>(null);
    const [loadingTablesFor, setLoadingTablesFor] = useState<string | null>(null);
    const [loadingDetailsFor, setLoadingDetailsFor] = useState<string | null>(null);

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

    // Persist expanded state to localStorage
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem(EXPLORER_TREE_STORAGE_KEY, JSON.stringify({
            expandedConnectionIds,
            expandedSchemaKeys,
            expandedTableKeys,
        }));
    }, [expandedConnectionIds, expandedSchemaKeys, expandedTableKeys]);

    const activeConnection = useMemo(
        () => connections.find((connection) => connection.id === activeConnectionId) ?? null,
        [connections, activeConnectionId],
    );

    // --- data loaders ---

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

    // --- effects ---

    // Load schemas when active connection changes
    useEffect(() => {
        if (!activeConnectionId) {
            return;
        }

        setExpandedConnectionIds((prev) =>
            prev.includes(activeConnectionId)
                ? prev
                : [...prev, activeConnectionId],
        );

        setSchemasByConnectionId((prev) => {
            if (!prev[activeConnectionId]) {
                void loadSchemas(activeConnectionId);
            }
            return prev;
        });
    }, [activeConnectionId]);

    // Restore table lists for schema nodes that were expanded before page reload.
    // Runs once on mount - deps are stable initial values from useState.
    const restoredSchemasRef = useRef(false);
    useEffect(() => {
        if (restoredSchemasRef.current) return;
        restoredSchemasRef.current = true;

        for (const schemaKey of persistedTreeState.expandedSchemaKeys) {
            const parts = schemaKey.split(':');
            if (parts.length !== 2) continue;
            void loadTables(Number(parts[0]), parts[1]);
        }
    }, [loadTables, persistedTreeState.expandedSchemaKeys]);

    // Restore column details for table nodes that were expanded before page reload.
    const restoredTablesRef = useRef(false);
    useEffect(() => {
        if (restoredTablesRef.current) return;
        restoredTablesRef.current = true;

        for (const tableKey of persistedTreeState.expandedTableKeys) {
            const parts = tableKey.split(':');
            if (parts.length !== 3) continue;
            void loadTableDetails(Number(parts[0]), parts[1], parts[2]);
        }
    }, [loadTableDetails, persistedTreeState.expandedTableKeys]);

    // --- tree interactions ---

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

        setTablesBySchemaKey((prev) => {
            if (!prev[schemaKey]) {
                void loadTables(connectionId, schema);
            }
            return prev;
        });
    }, [loadTables]);

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
