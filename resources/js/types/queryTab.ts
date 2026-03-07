import type {ConnectionDto} from "./connection";

export interface QueryTabDto {
    id: number;
    user_id: number;
    db_connection_id: number | null;
    title: string;
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
