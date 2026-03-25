import type {ExecuteQueryResponse} from "../types/queryResult";
import {apiClient} from "./client";

/**
 * Payload used by the query execution endpoint.
 *
 * The frontend can send either the full editor contents or a selected fragment.
 * The backend stores execution history and returns a grid-friendly response.
 */
export interface ExecuteQueryPayload {
    connection_id: number;
    query_tab_id?: number | null;
    sql: string;
    selected_sql?: string | null;
    max_rows?: 100 | 500 | 1000;
    save_to_history?: boolean;
}

/**
 * Executes SQL for the current workspace tab.
 *
 * The API always returns the normalized query result contract used by the
 * results panel, including structured error payloads.
 */
export async function executeQuery(payload: ExecuteQueryPayload): Promise<ExecuteQueryResponse> {
    const response = await apiClient.post<ExecuteQueryResponse>('/queries/execute', payload);

    return response.data;
}
