import {ConnectionDto} from "../../../types/connection";
import {QueryTabDto} from "../../../types/queryTab";
import {describe, expect, it} from "vitest";
import {useActiveWorkspace} from "./useActiveWorkspace";
import React from "react";
import {render} from "@testing-library/react";

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
        ssh_known_host_fingerprint: null,
        has_ssh_password: false,
        has_ssh_private_key: false,
        has_ssh_passphrase: false,
        connect_timeout_seconds: undefined,
        query_timeout_seconds: undefined,
        last_used_at: null,
        created_at: undefined,
        updated_at: undefined,
        ...overrides,
    };
}

function makeTab(overrides: Partial<QueryTabDto> = {}): QueryTabDto {
    return {
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
    };
}

function renderUseActiveWorkspace(params: Parameters<typeof useActiveWorkspace>[0]) {
    let hookResult!: ReturnType<typeof useActiveWorkspace>;

    function Harness() {
        const result = useActiveWorkspace(params);

        React.useEffect(() => {
            hookResult = result;
        }, [result]);

        return <div>ready </div>;
    }

    render(<Harness/>);

    return hookResult;
}

describe('useActiveWorkspace', () => {
    it('returns active tab, connection and tab index', () => {
        const tabs = [
            makeTab({id: 1, title: 'First', db_connection_id: 10}),
            makeTab({id: 2, title: 'Second', db_connection_id: 11}),
        ];

        const connections = [
            makeConnection({id: 10, name: 'Main DB'}),
            makeConnection({id: 11, name: 'Analytics DB'}),
        ];

        const tabStateById = {
            2: {
                isExecuting: false,
                result: null,
                error: null,
            },
        };

        const result = renderUseActiveWorkspace({
            activeTabId: 2,
            tabs,
            connections,
            activeConnectionId: 11,
            tabStateById,
        });

        expect(result.activeTab?.id).toBe(2);
        expect(result.activeConnection?.id).toBe(11);
        expect(result.activeTabIndex).toBe(1);
    });

    it('returns execution state and active result', () => {
        const tabs = [makeTab({id: 5, db_connection_id: 10})];
        const connections = [makeConnection({id: 10})];

        const queryResult = {
            columns: ['id', 'name'],
            rows: [
                {id: 1, name: 'Alice'},
                {id: 2, name: 'Bob'},
            ],
            rowsCount: 2,
            hasMoreRows: true,
        };

        const tabStateById = {
            5: {
                isExecuting: true,
                result: queryResult,
                error: null,
            },
        };

        const result = renderUseActiveWorkspace({
            activeTabId: 5,
            tabs,
            connections,
            activeConnectionId: 10,
            tabStateById,
        });

        expect(result.isExecuting).toBe(true);
        expect(result.activeResult).toEqual(queryResult);
        expect(result.activeRowsMeta).toEqual({
            rowsCount: null,
            hasMoreRows: false,
        });
    });

    it('derives cursor position, selection state and selected line count', () => {
        const tabs = [
            makeTab({
                id: 9,
                selected_text: 'from users\nwhere active = true',
                cursor_position: {
                    lineNumber: 2,
                    column: 7,
                },
                selection_range: {
                    startLineNumber: 1,
                    startColumn: 8,
                    endLineNumber: 2,
                    endColumn: 19,
                },
            }),
        ];

        const connections = [makeConnection()];
        const tabStateById = {
            9: {
                isExecuting: false,
                result: null,
                error: null,
            },
        };

        const result = renderUseActiveWorkspace({
            activeTabId: 9,
            tabs,
            connections,
            activeConnectionId: null,
            tabStateById,
        });

        expect(result.activeCursorPosition).toEqual({
            lineNumber: 2,
            column: 7,
        });

        expect(result.hasSelection).toBe(true);
        expect(result.activeSelectedLineCount).toBe(2);
    });

    it('returns safe empty defaults when active tab is missing', () => {
        const result = renderUseActiveWorkspace({
            activeTabId: 999,
            tabs: [makeTab({id: 1})],
            connections: [makeConnection({id: 10})],
            activeConnectionId: null,
            tabStateById: {},
        });

        expect(result.activeTab).toBeNull();
        expect(result.activeConnection).toBeUndefined();
        expect(result.activeResult).toBeNull();
        expect(result.isExecuting).toBe(false);
        expect(result.activeCursorPosition).toBeNull();
        expect(result.activeSelectedLineCount).toBeNull();
        expect(result.activeRowsMeta).toEqual({
            rowsCount: null,
            hasMoreRows: false,
        });
        expect(result.hasSelection).toBe(false);
        expect(result.activeTabIndex).toBe(-1);
    });

    it('treats blank selected text as no selection', () => {
        const tabs = [
            makeTab({
                id: 3,
                selected_text: '   ',
                selection_range: {
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 1,
                },
            }),
        ];

        const result = renderUseActiveWorkspace({
            activeTabId: 3,
            tabs,
            connections: [makeConnection()],
            activeConnectionId: null,
            tabStateById: {},
        });

        expect(result.hasSelection).toBe(false);
        expect(result.activeSelectedLineCount).toBeNull();
    });
});
