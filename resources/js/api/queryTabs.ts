import {QueryTabDto} from "../types/queryTab";
import {apiClient} from "./client";

export interface CreateQueryTabPayload {
    db_connection_id?: number | null;
    title?: string;
    sql_text?: string;
    selected_text?: string | null;
    cursor_position?: Record<string, unknown> | null;
    selection_range?: Record<string, unknown> | null;
    is_pinned?: boolean;
    result_limit?: 100 | 500 | 1000;
}

export interface UpdateQueryTabPayload {
    db_connection_id?: number | null;
    title?: string;
    sql_text?: string;
    selected_text?: string | null;
    cursor_position?: Record<string, unknown> | null;
    selection_range?: Record<string, unknown> | null;
    is_pinned?: boolean;
    last_executed_at?: string | null;
    result_limit?: 100 | 500 | 1000;
}

export async function fetchQueryTabs(): Promise<QueryTabDto[]> {
    const response = await apiClient.get<{ data: QueryTabDto[] }>('/query-tabs');

    return response.data.data;
}

export async function createQueryTab(payload: CreateQueryTabPayload): Promise<QueryTabDto> {
    const response = await apiClient.post<{ data: QueryTabDto }>('/query-tabs', payload);

    return response.data.data;
}

export async function updateQueryTab(id: number, payload: UpdateQueryTabPayload): Promise<QueryTabDto> {
    const response = await apiClient.patch<{ data: QueryTabDto }>(`/query-tabs/${id}`, payload);

    return response.data.data;
}

export async function deleteQueryTab(id: number): Promise<void> {
    await apiClient.delete(`/query-tabs/${id}`);
}

export async function reorderQueryTabs(
    tabs: Array<{ id: number; sort_order: number }>
): Promise<QueryTabDto[]> {
    const response = await apiClient.patch<{ data: QueryTabDto[] }>('/query-tabs/reorder', {
        tabs,
    });

    return response.data.data;
}
