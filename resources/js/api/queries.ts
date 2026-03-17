import type {ExecuteQueryResponse} from "../types/queryResult";
import {apiClient} from "./client";

export interface ExecuteQueryPayload {
    connection_id: number;
    query_tab_id?: number | null;
    sql: string;
    selected_sql?: string | null;
    max_rows?: 100 | 500 | 1000;
    save_to_history?: boolean;
}

export async function executeQuery(payload: ExecuteQueryPayload): Promise<ExecuteQueryResponse> {
    const response = await apiClient.post<ExecuteQueryResponse>('/queries/execute', payload);

    return response.data;
}
