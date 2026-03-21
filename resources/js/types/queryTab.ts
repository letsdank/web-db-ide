import type {ConnectionDto} from "./connection";

export type QueryTabType = 'sql' | 'erd';

export interface ErdTabMeta {
    connectionId: number;
    schema: string;
}

export interface QueryTabDto {
    id: number;
    user_id: number;
    db_connection_id: number | null;
    result_limit: 100 | 500 | 1000;
    title: string;
    tab_type: QueryTabType;
    meta: ErdTabMeta | Record<string, unknown> | null;
    sql_text: string;
    selected_text: string | null;
    cursor_position: Record<string, unknown> | null;
    selection_range: Record<string, unknown> | null;
    is_pinned: boolean;
    sort_order: number;
    last_executed_at: string | null;
    created_at: string;
    updated_at: string;
    connection: ConnectionDto | null;
}
