import {QueryTabDto} from "../types/queryTab";
import {apiClient} from "./client";

export async function fetchQueryTabs(): Promise<QueryTabDto[]> {
    const response = await apiClient.get<{ data: QueryTabDto[] }>('/query-tabs');

    return response.data.data;
}

export async function createQueryTab(payload?: Partial<QueryTabDto>): Promise<QueryTabDto> {
    const response = await apiClient.post<{ data: QueryTabDto }>('/query-tabs', payload ?? {});

    return response.data.data;
}

export async function updateQueryTab(
    id: number,
    payload: Partial<QueryTabDto>,
): Promise<QueryTabDto> {
    const response = await apiClient.patch<{ data: QueryTabDto }>(`/query-tabs/${id}`, payload);

    return response.data.data;
}
