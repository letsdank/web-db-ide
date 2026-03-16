import {
    ConnectionDto,
    CreateConnectionPayload,
    TestConnectionResultDto,
    UpdateConnectionPayload
} from "../../../types/connection";
import {QueryTabDto} from "../../../types/queryTab";
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
        } catch (error: any) {
            console.error(error);

            setConnectionDialogError(
                error?.response?.data?.message ||
                error?.message ||
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
