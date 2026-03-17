import {beforeEach, describe, expect, it, vi} from "vitest";
import {useWorkspaceLibrary} from "./useWorkspaceLibrary";
import React from "react";
import type {SavedQueryDto} from "../../../types/savedQuery";
import * as savedQueriesApi from '../../../api/savedQueries';
import {render} from "@testing-library/react";
import type {SaveQueryDialogSubmitPayload} from "../../../components/workspace/SaveQueryDialog";

vi.mock('../../../api/savedQueries', async () => {
    return {
        createSavedQuery: vi.fn(),
        updateSavedQuery: vi.fn(),
    };
});

describe('useWorkspaceLibrary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates saved query and switches right panel to saved', async () => {
        const addSavedQuery = vi.fn();
        const setRightPanel = vi.fn();
        const handleCreateTab = vi.fn();

        const savedQuery: SavedQueryDto = {
            id: 1,
            user_id: 1,
            db_connection_id: 12,
            title: 'Shared users',
            description: null,
            sql_text: 'select * from users;',
            folder: 'Team',
            visibility: 'shared',
            created_at: null,
            updated_at: null,
            connection: null,
        };

        vi.mocked(savedQueriesApi.createSavedQuery).mockResolvedValue(savedQuery);

        let hookApi!: ReturnType<typeof useWorkspaceLibrary>;

        function TestHarness() {
            const api = useWorkspaceLibrary({
                activeTab: {
                    id: 7,
                    user_id: 1,
                    db_connection_id: 12,
                    title: 'Users query',
                    sql_text: 'select * from users;',
                    sort_order: 10,
                    is_pinned: false,
                    created_at: null,
                    updated_at: null,
                },
                activeConnectionId: 12,
                addSavedQuery,
                setRightPanel,
                handleCreateTab,
                updateSavedQueryInList: vi.fn(),
            });

            React.useEffect(() => {
                hookApi = api;
            }, [api]);

            return <div>ready</div>;
        }

        render(<TestHarness/>);

        const payload: SaveQueryDialogSubmitPayload = {
            title: 'Shared users',
            folder: 'Team',
            visibility: 'shared',
        };

        await hookApi.handleSaveCurrentQuery(payload);

        expect(savedQueriesApi.createSavedQuery).toHaveBeenCalledWith({
            db_connection_id: 12,
            title: 'Shared users',
            sql_text: 'select * from users;',
            folder: 'Team',
            visibility: 'shared',
        });

        expect(addSavedQuery).toHaveBeenCalledWith(savedQuery);
        expect(setRightPanel).toHaveBeenCalledWith('saved');
    });

    it('opens history item in a new tab', async () => {
        const handleCreateTab = vi.fn();

        let hookApi!: ReturnType<typeof useWorkspaceLibrary>;

        function TestHarness() {
            const api = useWorkspaceLibrary({
                activeTab: {
                    id: 7,
                    user_id: 1,
                    db_connection_id: 12,
                    title: 'Users query',
                    sql_text: 'select * from users;',
                    sort_order: 10,
                    is_pinned: false,
                    created_at: null,
                    updated_at: null,
                },
                activeConnectionId: 12,
                addSavedQuery: vi.fn(),
                setRightPanel: vi.fn(),
                handleCreateTab,
                updateSavedQueryInList: vi.fn(),
            });

            React.useEffect(() => {
                hookApi = api;
            }, [api]);

            return <div>ready</div>;
        }

        render(<TestHarness/>);

        await hookApi.handleOpenHistoryItem({
            id: 3,
            user_id: 1,
            db_connection_id: 5,
            sql_text: 'select * from audit_log;',
            status: 'success',
            duration_ms: 10,
            row_count: 20,
            executed_at: '2026-03-16T12:00:00Z',
            created_at: null,
            updated_at: null,
        });

        expect(handleCreateTab).toHaveBeenCalledWith({
            title: 'History Query',
            sql_text: 'select * from audit_log;',
            db_connection: 5,
        });
    });

    it('opens saved query in a new tab', async () => {
        const handleCreateTab = vi.fn();

        let hookApi!: ReturnType<typeof useWorkspaceLibrary>;

        function TestHarness() {
            const api = useWorkspaceLibrary({
                activeTab: {
                    id: 7,
                    user_id: 1,
                    db_connection_id: 12,
                    title: 'Users query',
                    sql_text: 'select * from users;',
                    sort_order: 10,
                    is_pinned: false,
                    created_at: null,
                    updated_at: null,
                },
                activeConnectionId: 12,
                addSavedQuery: vi.fn(),
                setRightPanel: vi.fn(),
                handleCreateTab,
                updateSavedQueryInList: vi.fn(),
            });

            React.useEffect(() => {
                hookApi = api;
            }, [api]);

            return <div>ready</div>;
        }

        render(<TestHarness/>);

        await hookApi.handleOpenSavedQuery({
            id: 4,
            user_id: 1,
            db_connection_id: 6,
            title: 'Orders report',
            description: null,
            sql_text: 'select * from orders;',
            folder: 'Reports',
            visibility: 'private',
            created_at: null,
            updated_at: null,
            connection: null,
        });

        expect(handleCreateTab).toHaveBeenCalledWith({
            title: 'Orders report',
            sql_text: 'select * from orders;',
            db_connection: 6,
        });
    });

    it('updates saved query and keep saved panel active', async () => {
        const updateSavedQueryInList = vi.fn();
        const setRightPanel = vi.fn();
        const handleCreateTab = vi.fn();

        const savedQuery: SavedQueryDto = {
            id: 5,
            user_id: 1,
            db_connection_id: 12,
            title: 'Team users updated',
            description: null,
            sql_text: 'select * from users;',
            folder: 'Team',
            visibility: 'shared',
            created_at: null,
            updated_at: null,
            connection: null,
        };

        vi.mocked(savedQueriesApi.updateSavedQuery).mockResolvedValue(savedQuery);

        let hookApi!: ReturnType<typeof useWorkspaceLibrary>;

        function TestHarness() {
            const api = useWorkspaceLibrary({
                activeTab: {
                    id: 7,
                    user_id: 1,
                    db_connection_id: 12,
                    title: 'Users query',
                    sql_text: 'select * from users;',
                    sort_order: 10,
                    is_pinned: false,
                    created_at: null,
                    updated_at: null,
                },
                activeConnectionId: 12,
                addSavedQuery: vi.fn(),
                updateSavedQueryInList,
                setRightPanel,
                handleCreateTab,
            });

            React.useEffect(() => {
                hookApi = api;
            }, [api]);

            return <div>ready</div>;
        }

        render(<TestHarness/>);

        await hookApi.handleUpdateSavedQuery(
            {
                id: 5,
                user_id: 1,
                db_connection_id: 12,
                title: 'Team users',
                description: null,
                sql_text: 'select * from users;',
                folder: 'General',
                visibility: 'private',
                created_at: null,
                updated_at: null,
                connection: null,
            },
            {
                title: 'Team users updated',
                folder: 'Team',
                visibility: 'shared',
            },
        );

        expect(savedQueriesApi.updateSavedQuery).toHaveBeenCalledWith(5, {
            title: 'Team users updated',
            folder: 'Team',
            visibility: 'shared',
        });

        expect(updateSavedQueryInList).toHaveBeenCalledWith(savedQuery);
        expect(setRightPanel).toHaveBeenCalledWith('saved');
    });
});
