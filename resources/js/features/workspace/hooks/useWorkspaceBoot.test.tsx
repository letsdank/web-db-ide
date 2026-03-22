import * as connectionsApi from '../../../api/connections';
import * as queryTabsApi from '../../../api/queryTabs';
import * as queryHistoryApi from '../../../api/queryHistory';
import * as savedQueriesApi from '../../../api/savedQueries';
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {ConnectionDto} from "../../../types/connection";
import type {QueryTabDto} from "../../../types/queryTab";
import type {QueryHistoryDto} from "../../../types/queryHistory";
import type {SavedQueryDto} from "../../../types/savedQuery";
import {useWorkspaceBoot} from "./useWorkspaceBoot";
import {render, waitFor} from "@testing-library/react";
import {makeQueryTab} from "../../../test/factories";

vi.mock('../../../api/connections', async () => ({
    fetchConnections: vi.fn(),
}));

vi.mock('../../../api/queryTabs', async () => ({
    fetchQueryTabs: vi.fn(),
}));

vi.mock('../../../api/queryHistory', async () => ({
    fetchQueryHistory: vi.fn(),
}));

vi.mock('../../../api/savedQueries', async () => ({
    fetchSavedQueries: vi.fn(),
}));

function makeConnection(overrides: Partial<ConnectionDto> = {}): ConnectionDto {
    return {
        id: 10,
        user_id: 1,
        name: 'Main DB',
        driver: 'pgsql',
        host: '127.0.0.1',
        port: 5432,
        database_name: 'main_db',
        username: 'postgres',
        schema_default: 'public',
        ssl_mode: null,
        color: null,
        visibility: 'private',
        is_favorite: false,
        is_read_only: false,
        use_ssh_tunnel: false,
        ssh_host: null,
        ssh_port: null,
        ssh_username: null,
        ssh_password: null,
        ssh_private_key: null,
        ssh_passphrase: null,
        ssh_known_host_fingerprint: null,
        has_ssh_password: false,
        has_ssh_private_key: false,
        has_ssh_passphrase: false,
        connect_timeout_seconds: 10,
        query_timeout_seconds: 30,
        meta: null,
        last_used_at: null,
        created_at: null,
        updated_at: null,
        is_owner: true,
        access_scope: 'owned',
        ...overrides,
    };
}

function makeTab(overrides: Partial<QueryTabDto> = {}): QueryTabDto {
    return makeQueryTab({
        id: 1,
        user_id: 1,
        db_connection_id: 10,
        title: 'Users query',
        sql_text: 'select * from users;',
        sort_order: 0,
        is_pinned: false,
        result_limit: 100,
        selected_text: null,
        cursor_position: null,
        selection_range: null,
        last_executed_at: null,
        created_at: '',
        updated_at: '',
        connection: null,
        ...overrides,
    });
}

function makeHistory(overrides: Partial<QueryHistoryDto> = {}): QueryHistoryDto {
    return {
        id: 1,
        user_id: 1,
        db_connection_id: 10,
        sql_text: 'select * from users;',
        status: 'success',
        duration_ms: 12,
        row_count: 15,
        executed_at: '2026-03-17T12:00:00Z',
        meta: {},
        error_message: null,
        query_tab_id: null,
        statement_count: null,
        ...overrides,
    };
}

function makeSavedQuery(overrides: Partial<SavedQueryDto> = {}): SavedQueryDto {
    return {
        id: 1,
        user_id: 1,
        db_connection_id: 10,
        title: 'Saved users',
        description: null,
        sql_text: 'select * from users;',
        folder: 'General',
        visibility: 'private',
        created_at: null,
        updated_at: null,
        connection: null,
        is_owner: true,
        access_scope: 'owned',
        ...overrides,
    };
}

describe('useWorkspaceBoot', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('loads workspace resources and selects first tab/connection', async () => {
        const setConnections = vi.fn();
        const setTabs = vi.fn();
        const setQueryHistory = vi.fn();
        const setSavedQueries = vi.fn();
        const setActiveTabId = vi.fn();
        const setActiveConnectionId = vi.fn();
        const setBooting = vi.fn();
        const ensureTabState = vi.fn();

        const connections = [
            makeConnection({id: 10, name: 'Main DB'}),
            makeConnection({id: 11, name: 'Analytics DB'}),
        ];

        const tabs = [
            makeTab({id: 5, db_connection_id: 11, sort_order: 0, title: 'Analytics tab'}),
            makeTab({id: 6, db_connection_id: 10, sort_order: 1, title: 'Users tab'}),
        ];

        const history = [makeHistory()];
        const savedQueries = [makeSavedQuery()];

        vi.mocked(connectionsApi.fetchConnections).mockResolvedValue(connections);
        vi.mocked(queryTabsApi.fetchQueryTabs).mockResolvedValue(tabs);
        vi.mocked(queryHistoryApi.fetchQueryHistory).mockResolvedValue(history);
        vi.mocked(savedQueriesApi.fetchSavedQueries).mockResolvedValue(savedQueries);

        function Harness() {
            useWorkspaceBoot({
                setConnections,
                setTabs,
                setQueryHistory,
                setSavedQueries,
                setActiveTabId,
                setActiveConnectionId,
                ensureTabState,
                setBooting,
            });

            return <div>ready</div>;
        }

        render(<Harness/>);

        await waitFor(() => {
            expect(setBooting).toHaveBeenCalledWith(false);
        });

        expect(setConnections).toHaveBeenCalledWith(connections);
        expect(setTabs).toHaveBeenCalledWith(tabs);
        expect(setQueryHistory).toHaveBeenCalledWith(history);
        expect(setSavedQueries).toHaveBeenCalledWith(savedQueries);

        expect(setActiveTabId).toHaveBeenCalledWith(5);
        expect(setActiveConnectionId).toHaveBeenCalledWith(11);
        expect(ensureTabState).toHaveBeenCalledWith(5);
    });

    it('falls back to first connection when there are no tabs', async () => {
        const setConnections = vi.fn();
        const setTabs = vi.fn();
        const setQueryHistory = vi.fn();
        const setSavedQueries = vi.fn();
        const setActiveTabId = vi.fn();
        const setActiveConnectionId = vi.fn();
        const setBooting = vi.fn();
        const ensureTabState = vi.fn();

        const connections = [
            makeConnection({id: 22, name: 'Fallback DB'}),
        ];

        vi.mocked(connectionsApi.fetchConnections).mockResolvedValue(connections);
        vi.mocked(queryTabsApi.fetchQueryTabs).mockResolvedValue([]);
        vi.mocked(queryHistoryApi.fetchQueryHistory).mockResolvedValue([]);
        vi.mocked(savedQueriesApi.fetchSavedQueries).mockResolvedValue([]);

        function Harness() {
            useWorkspaceBoot({
                setConnections,
                setTabs,
                setQueryHistory,
                setSavedQueries,
                setActiveTabId,
                setActiveConnectionId,
                ensureTabState,
                setBooting,
            });

            return <div>ready</div>;
        }

        render(<Harness/>);

        await waitFor(() => {
            expect(setBooting).toHaveBeenCalledWith(false);
        })

        expect(setConnections).toHaveBeenCalledWith(connections);
        expect(setTabs).toHaveBeenCalledWith([]);
        expect(setQueryHistory).toHaveBeenCalledWith([]);
        expect(setSavedQueries).toHaveBeenCalledWith([]);

        expect(setActiveTabId).toHaveBeenCalledWith(null);
        expect(ensureTabState).not.toHaveBeenCalled();
        expect(setActiveConnectionId).toHaveBeenCalledWith(22);
    });

    it('sets active tab and active connection to null where there are no tabs and no connections', async () => {
        const setConnections = vi.fn();
        const setTabs = vi.fn();
        const setQueryHistory = vi.fn();
        const setSavedQueries = vi.fn();
        const setActiveTabId = vi.fn();
        const setActiveConnectionId = vi.fn();
        const setBooting = vi.fn();
        const ensureTabState = vi.fn();

        vi.mocked(connectionsApi.fetchConnections).mockResolvedValue([]);
        vi.mocked(queryTabsApi.fetchQueryTabs).mockResolvedValue([]);
        vi.mocked(queryHistoryApi.fetchQueryHistory).mockResolvedValue([]);
        vi.mocked(savedQueriesApi.fetchSavedQueries).mockResolvedValue([]);

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        function Harness() {
            useWorkspaceBoot({
                setConnections,
                setTabs,
                setQueryHistory,
                setSavedQueries,
                setActiveTabId,
                setActiveConnectionId,
                ensureTabState,
                setBooting,
            });

            return <div>ready</div>;
        }

        render(<Harness/>);

        await waitFor(() => {
            expect(setBooting).toHaveBeenCalledWith(false);
        });

        expect(setConnections).toHaveBeenCalledWith([]);
        expect(setTabs).toHaveBeenCalledWith([]);
        expect(setQueryHistory).toHaveBeenCalledWith([]);
        expect(setSavedQueries).toHaveBeenCalledWith([]);

        expect(setActiveTabId).toHaveBeenCalledWith(null);
        expect(setActiveConnectionId).toHaveBeenCalledWith(null);
        expect(ensureTabState).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();

        errorSpy.mockRestore();
    });

    it('still stops booting when one of boot requests fails', async () => {
        const setConnections = vi.fn();
        const setTabs = vi.fn();
        const setQueryHistory = vi.fn();
        const setSavedQueries = vi.fn();
        const setActiveTabId = vi.fn();
        const setActiveConnectionId = vi.fn();
        const setBooting = vi.fn();
        const ensureTabState = vi.fn();

        vi.mocked(connectionsApi.fetchConnections).mockRejectedValue(new Error('boom'));
        vi.mocked(queryTabsApi.fetchQueryTabs).mockResolvedValue([]);
        vi.mocked(queryHistoryApi.fetchQueryHistory).mockResolvedValue([]);
        vi.mocked(savedQueriesApi.fetchSavedQueries).mockResolvedValue([]);

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        function Harness() {
            useWorkspaceBoot({
                setConnections,
                setTabs,
                setQueryHistory,
                setSavedQueries,
                setActiveTabId,
                setActiveConnectionId,
                ensureTabState,
                setBooting,
            });

            return <div>ready</div>;
        }

        render(<Harness/>);

        await waitFor(() => {
            expect(setBooting).toHaveBeenCalledWith(false);
        });

        expect(errorSpy).toHaveBeenCalled();
        expect(setConnections).not.toHaveBeenCalled();
        expect(setTabs).not.toHaveBeenCalled();
        expect(setQueryHistory).not.toHaveBeenCalled();
        expect(setSavedQueries).not.toHaveBeenCalled();

        errorSpy.mockRestore();
    });
});
