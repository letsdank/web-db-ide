import {QueryHistoryDto} from "../types/queryHistory";
import {apiClient} from "./client";

export async function fetchQueryHistory(): Promise<QueryHistoryDto[]> {
    const response = await apiClient.get<{ data: QueryHistoryDto[] }>('/query-history');

    return response.data.data;
}
