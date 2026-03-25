import type {
    ConnectionDto,
    CreateConnectionPayload,
    TestConnectionResultDto,
    UpdateConnectionPayload
} from "../../../types/connection";
import type {QueryTabDto} from "../../../types/queryTab";
import {useCallback} from "react";
import {updateQueryTab} from "../../../api/queryTabs";
import {
    createConnection,
    deleteConnection,
    testConnection,
    testExistingConnection,
    updateConnection
} from "../../../api/connections";
import {useI18n} from "../../../i18n";

/**
 * Store actions and active workspace state required for connection-management flows.
 */
interface Params {
    editingConnection: ConnectionDto | null;
    activeConnectionId: number | null;
    activeTab: QueryTabDto | null;
    connections: ConnectionDto[];
    tabs: QueryTabDto[];

    addConnection: (connection: ConnectionDto) => void;
    updateConnectionInList: (connection: ConnectionDto) => void;
    removeConnection: (connectionId: number) => void;
    upsertTab: (tab: QueryTabDto) => void;

    setActiveConnectionId: (id: number | null) => void;
    setIsCreatingConnection: (value: boolean) => void;
    setConnectionDialogError: (value: string | null) => void;

    closeConnectionDialog: () => void;
}

/**
 * Encapsulates create/update/delete/test flows for database connections.
 *
 * The hook also keeps tabs consistent with connection mutations:
 * - newly created connections can be attached to the active tab
 * - deleted connections are detached from tabs that referenced them
 */
export function useWorkspaceConnections({
                                            editingConnection,
                                            activeConnectionId,
                                            activeTab,
                                            connections,
                                            tabs,
                                            addConnection,
                                            updateConnectionInList,
                                            removeConnection,
                                            upsertTab,
                                            setActiveConnectionId,
                                            setIsCreatingConnection,
                                            setConnectionDialogError,
                                            closeConnectionDialog,
                                        }: Params) {
    const {t} = useI18n();

    /**
     * Removes a deleted connection binding from every affected tab.
     */
    const detachTabsFromConnection = useCallback(async (connectionId: number) => {
        const affectedTabs = tabs.filter((tab) => tab.db_connection_id === connectionId);

        if (affectedTabs.length === 0) {
            return;
        }

        const updatedTabs = await Promise.all(
            affectedTabs.map((tab) =>
                updateQueryTab(tab.id, {
                    db_connection_id: null,
                }),
            ),
        );

        updatedTabs.forEach((tab) => upsertTab(tab));
    }, [tabs, upsertTab]);

    /**
     * Creates a new connection or updates an existing one, depending on whether
     * the dialog is currently in edit mode.
     *
     * For newly created connections, the active tab is rebound to the new
     * connection so the user can start querying immediately.
     */
    const handleCreateConnection = useCallback(async (
        payload: CreateConnectionPayload | UpdateConnectionPayload,
    ) => {
        setIsCreatingConnection(true);
        setConnectionDialogError(null);

        try {
            if (editingConnection) {
                const updated = await updateConnection(
                    editingConnection.id,
                    payload as UpdateConnectionPayload,
                );

                updateConnectionInList(updated);

                if (activeConnectionId === updated.id) {
                    setActiveConnectionId(updated.id);
                }

                closeConnectionDialog();
                return;
            }

            const created = await createConnection(payload as CreateConnectionPayload);

            addConnection(created);
            setActiveConnectionId(created.id);
            closeConnectionDialog();

            if (activeTab) {
                const updatedTab = await updateQueryTab(activeTab.id, {
                    db_connection_id: created.id,
                });

                upsertTab(updatedTab);
            }
        } catch (error: unknown) {
            console.error(error);

            const errorLike = typeof error === 'object' && error !== null
                ? error as {
                    response?: { data?: { message?: string } };
                    message?: string;
                }
                : null;

            setConnectionDialogError(
                errorLike?.response?.data?.message ||
                errorLike?.message ||
                (editingConnection
                    ? t('workspace.failedToUpdateConnection')
                    : t('workspace.failedToCreateConnection')),
            );
        } finally {
            setIsCreatingConnection(false);
        }
    }, [
        editingConnection,
        activeConnectionId,
        activeTab,
        addConnection,
        closeConnectionDialog,
        setActiveConnectionId,
        setConnectionDialogError,
        setIsCreatingConnection,
        updateConnectionInList,
        upsertTab,
        t,
    ]);

    /**
     * Deletes a connection after explicit confirmation and detaches it from
     * tabs that were bound to it.
     */
    const handleDeleteConnection = useCallback(async (connection: { id: number; name: string }) => {
        const confirmed = window.confirm(
            t('workspace.deleteConnectionConfirm', {name: connection.name}),
        );

        if (!confirmed) {
            return;
        }

        try {
            await deleteConnection(connection.id);

            removeConnection(connection.id);
            await detachTabsFromConnection(connection.id);

            if (activeConnectionId === connection.id) {
                const nextConnection = connections.find((item) => item.id !== connection.id) ?? null;
                setActiveConnectionId(nextConnection?.id ?? null);
            }
        } catch (error) {
            console.error(error);
        }
    }, [
        activeConnectionId,
        connections,
        detachTabsFromConnection,
        removeConnection,
        setActiveConnectionId,
        t,
    ]);

    /**
     * Runs a connectivity test for either a brand-new connection payload or the
     * currently edited persisted connection.
     */
    const handleTestConnection = useCallback(async (
        payload: CreateConnectionPayload | UpdateConnectionPayload
    ): Promise<TestConnectionResultDto> => {
        if (editingConnection) {
            return await testExistingConnection(editingConnection.id, payload);
        }

        return await testConnection(payload);
    }, [editingConnection]);

    return {
        handleCreateConnection,
        handleDeleteConnection,
        handleTestConnection,
    };
}
