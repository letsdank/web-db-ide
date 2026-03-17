import type {SavedQueryDto} from "../types/savedQuery";
import {apiClient} from "./client";

export interface CreateSavedQueryPayload {
    db_connection_id?: number | null;
    title: string;
    description?: string | null;
    sql_text: string;
    folder?: string | null;
    visibility?: 'private' | 'shared';
}

export interface UpdateSavedQueryPayload {
    title?: string;
    description?: string | null;
    sql_text?: string;
    folder?: string | null;
    visibility?: 'private' | 'shared';
}

export async function fetchSavedQueries(): Promise<SavedQueryDto[]> {
    const response = await apiClient.get<{ data: SavedQueryDto[] }>('/saved-queries');

    return response.data.data;
}

export async function createSavedQuery(payload: CreateSavedQueryPayload): Promise<SavedQueryDto> {
    const response = await apiClient.post<{ data: SavedQueryDto }>('/saved-queries', payload);

    return response.data.data;
}

export async function updateSavedQuery(
    savedQueryId: number,
    payload: UpdateSavedQueryPayload,
): Promise<SavedQueryDto> {
    const response = await apiClient.put<{ data: SavedQueryDto }>(`/saved-queries/${savedQueryId}`, payload);

    return response.data.data;
}
