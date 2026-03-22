import type {QueryTabDto} from "../types/queryTab";

export function makeQueryTab(overrides: Partial<QueryTabDto> = {}): QueryTabDto {
    return {
        id: 1,
        user_id: 1,
        db_connection_id: null,
        result_limit: 500,
        title: 'New Query',
        tab_type: 'sql',
        meta: null,
        sql_text: '',
        selected_text: null,
        cursor_position: null,
        selection_range: null,
        is_pinned: false,
        sort_order: 0,
        last_executed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        connection: null,
        ...overrides,
    };
}
