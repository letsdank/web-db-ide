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

function parseSchemaKey(schemaKey: string): { connectionId: number; schema: string } | null {
    const separatorIndex = schemaKey.indexOf(':');

    if (separatorIndex <= 0) {
        return null;
    }

    const connectionId = Number(schemaKey.slice(0, separatorIndex));
    const schema = schemaKey.slice(separatorIndex + 1);

    if (!Number.isFinite(connectionId) || !schema) {
        return null;
    }

    return {
        connectionId,
        schema,
    };
}

function parseTableKey(tableKey: string): { connectionId: number; schema: string; table: string } | null {
    const firstSeparatorIndex = tableKey.indexOf(':');
    const secondSeparatorIndex = tableKey.indexOf(':', firstSeparatorIndex + 1);

    if (firstSeparatorIndex <= 0 || secondSeparatorIndex <= firstSeparatorIndex + 1) {
        return null;
    }

    const connectionId = Number(tableKey.slice(0, firstSeparatorIndex));
    const schema = tableKey.slice(firstSeparatorIndex + 1, secondSeparatorIndex);
    const table = tableKey.slice(secondSeparatorIndex + 1);

    if (!Number.isFinite(connectionId) || !schema || !table) {
        return null;
    }

    return {
        connectionId,
        schema,
        table,
    };
}

function isHttp404(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }

    const errorLike = error as {
        response?: {
            status?: number;
        };
    };

    return errorLike.response?.status === 404;
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
    const [expandedTableKeySet, setExpandedTableKeySet] = useState<Set<string>>(
        () => new Set(persistedTreeState.expandedTableKeys),
    );

    const validConnectionIdSet = useMemo(
        () => new Set(connections.map((connection) => connection.id)),
        [connections],
    );

    const restorableSchemaKeys = useMemo(
        () => persistedTreeState.expandedSchemaKeys.filter((schemaKey) => {
            const parsed = parseSchemaKey(schemaKey);

            return parsed !== null && validConnectionIdSet.has(parsed.connectionId);
        }),
        [persistedTreeState.expandedSchemaKeys, validConnectionIdSet],
    );

    const restorableTableKeys = useMemo(
        () => persistedTreeState.expandedTableKeys.filter((tableKey) => {
            const parsed = parseTableKey(tableKey);

            return parsed !== null && validConnectionIdSet.has(parsed.connectionId);
        }),
        [persistedTreeState.expandedTableKeys, validConnectionIdSet],
    );

    // Persist expanded state to localStorage
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem(EXPLORER_TREE_STORAGE_KEY, JSON.stringify({
            expandedConnectionIds,
            expandedSchemaKeys,
            expandedTableKeys: Array.from(expandedTableKeySet),
        }));
    }, [expandedConnectionIds, expandedSchemaKeys, expandedTableKeySet]);

    const activeConnection = useMemo(
        () => connections.find((connection) => connection.id === activeConnectionId) ?? null,
        [connections, activeConnectionId],
    );

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

            if (isHttp404(error)) {
                setExpandedSchemaKeys((prev) => prev.filter((schemaKey) => schemaKey !== key));

                setExpandedTableKeySet((prev) => {
                    const stalePrefix = `${key}:`;
                    let changed = false;
                    const next = new Set<string>();

                    prev.forEach((tableKey) => {
                        if (tableKey.startsWith(stalePrefix)) {
                            changed = true;
                            return;
                        }

                        next.add(tableKey);
                    });

                    return changed ? next : prev;
                });

                setTablesBySchemaKey((prev) => {
                    if (!(key in prev)) {
                        return prev;
                    }

                    const next = {...prev};
                    delete next[key];
                    return next;
                });

                setDetailsByTableKey((prev) => {
                    const stalePrefix = `${key}:`;
                    let changed = false;
                    const next: Record<string, ExplorerTableDetailsDto> = {};

                    Object.entries(prev).forEach(([tableKey, details]) => {
                        if (tableKey.startsWith(stalePrefix)) {
                            changed = true;
                            return;
                        }

                        next[tableKey] = details;
                    });

                    return changed ? next : prev;
                });
            }
        } finally {
            setLoadingTablesFor((current) => (current === key ? null : current));
        }
    }, []);

    const loadSchemas = useCallback(async (connectionId: number) => {
        setLoadingSchemasFor(connectionId);

        try {
            const schemas = await fetchSchemas(connectionId);

            setSchemasByConnectionId((prev) => ({
                ...prev,
                [connectionId]: schemas,
            }));

            // Auto-load tables for all schemas of the active connection
            // so autocomplete has table names available without manual expansion.
            // Details (columns) are still lazy - loaded only on expand.
            await Promise.all(
                schemas.map((schema) => loadTables(connectionId, schema)),
            );
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingSchemasFor((current) => (current === connectionId ? null : current));
        }
    }, [loadTables]);

    const loadTableDetails = useCallback(async (connectionId: number, schema: string, table: string) => {
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

            if (isHttp404(error)) {
                setExpandedTableKeySet((prev) => {
                    if (!prev.has(key)) {
                        return prev;
                    }

                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });

                setDetailsByTableKey((prev) => {
                    if (!(key in prev)) {
                        return prev;
                    }

                    const next = {...prev};
                    delete next[key];
                    return next;
                });
            }

            return null;
        } finally {
            setLoadingDetailsFor((current) => (current === key ? null : current));
        }
    }, []);

    // Drop stale persisted explorer state when connection ids changed after DB reset/import.
    useEffect(() => {
        if (connections.length === 0) {
            return;
        }

        setExpandedConnectionIds((prev) => {
            const next = prev.filter((connectionId) => validConnectionIdSet.has(connectionId));
            return next.length === prev.length ? prev : next;
        });

        setExpandedSchemaKeys((prev) => {
            const next = prev.filter((schemaKey) => {
                const parsed = parseSchemaKey(schemaKey);
                return parsed !== null && validConnectionIdSet.has(parsed.connectionId);
            });

            return next.length === prev.length ? prev : next;
        });

        setExpandedTableKeySet((prev) => {
            const nextEntries = Array.from(prev).filter((tableKey) => {
                const parsed = parseTableKey(tableKey);
                return parsed !== null && validConnectionIdSet.has(parsed.connectionId);
            });

            return nextEntries.length === prev.size ? prev : new Set(nextEntries);
        });

        setSchemasByConnectionId((prev) => {
            let changed = false;
            const next: Record<number, string[]> = {};

            Object.entries(prev).forEach(([rawConnectionId, schemas]) => {
                const connectionId = Number(rawConnectionId);

                if (validConnectionIdSet.has(connectionId)) {
                    next[connectionId] = schemas;
                    return;
                }

                changed = true;
            });

            return changed ? next : prev;
        });

        setTablesBySchemaKey((prev) => {
            let changed = false;
            const next: Record<string, ExplorerTableDto[]> = {};

            Object.entries(prev).forEach(([schemaKey, tables]) => {
                const parsed = parseSchemaKey(schemaKey);

                if (parsed !== null && validConnectionIdSet.has(parsed.connectionId)) {
                    next[schemaKey] = tables;
                    return;
                }

                changed = true;
            });

            return changed ? next : prev;
        });

        setDetailsByTableKey((prev) => {
            let changed = false;
            const next: Record<string, ExplorerTableDetailsDto> = {};

            Object.entries(prev).forEach(([tableKey, details]) => {
                const parsed = parseTableKey(tableKey);

                if (parsed !== null && validConnectionIdSet.has(parsed.connectionId)) {
                    next[tableKey] = details;
                    return;
                }

                changed = true;
            });

            return changed ? next : prev;
        });
    }, [connections.length, validConnectionIdSet]);

    // Load schemas when active connection changes
    useEffect(() => {
        if (!activeConnectionId || !validConnectionIdSet.has(activeConnectionId)) {
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
    }, [activeConnectionId, loadTables, validConnectionIdSet]);

    // Restore table lists only after connections are loaded and only for valid connection ids.
    const restoredSchemasRef = useRef(false);
    useEffect(() => {
        if (restoredSchemasRef.current || connections.length === 0) {
            return;
        }

        restoredSchemasRef.current = true;

        for (const schemaKey of restorableSchemaKeys) {
            const parsed = parseSchemaKey(schemaKey);

            if (!parsed) {
                continue;
            }

            void loadTables(parsed.connectionId, parsed.schema);
        }
    }, [connections.length, loadTables, restorableSchemaKeys]);

    // Restore column details only after connections are loaded and only for valid connection ids.
    const restoredTablesRef = useRef(false);
    useEffect(() => {
        if (restoredTablesRef.current || connections.length === 0) {
            return;
        }

        restoredTablesRef.current = true;

        for (const tableKey of restorableTableKeys) {
            const parsed = parseTableKey(tableKey);

            if (!parsed) {
                continue;
            }

            void loadTableDetails(parsed.connectionId, parsed.schema, parsed.table);
        }
    }, [connections.length, loadTableDetails, restorableTableKeys]);

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

        setExpandedTableKeySet((prev) => {
                const next = new Set(prev);
                next.has(tableKey) ? next.delete(tableKey) : next.add(tableKey);
                return next;
            }
        );
    }, []);

    return {
        activeConnection,
        schemasByConnectionId,
        tablesBySchemaKey,
        detailsByTableKey,
        expandedConnectionIds,
        expandedSchemaKeys,
        expandedTableKeySet,
        loadingSchemasFor,
        loadingTablesFor,
        loadingDetailsFor,
        toggleConnection,
        toggleSchema,
        toggleTable,
        loadTableDetails,
    };
}
