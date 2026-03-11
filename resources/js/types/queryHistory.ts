export interface QueryHistoryDto {
    id: number;
    user_id: number;
    db_connection_id: number | null;
    query_tab_id: number | null;
    sql_text: string;
    statement_count: number | null;
    executed_at: string;
    duration_ms: number | null;
    status: 'success' | 'error' | string;
    row_count: number | null;
    error_message: string | null;
    meta: Record<string, unknown> | null;
}
