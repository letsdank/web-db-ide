import {apiClient} from "./client";
import {ExplorerTableDetailsDto, ExplorerTableDto} from "../types/explorer";

export async function fetchSchemas(connectionId: number): Promise<string[]> {
    const response = await apiClient.get<{ data: string[] }>(`/connections/${connectionId}/schemas`);

    return response.data.data;
}

export async function fetchTables(connectionId: number, schema: string): Promise<ExplorerTableDto[]> {
    const response = await apiClient.get<{ data: ExplorerTableDto[] }>(
        `/connections/${connectionId}/schemas/${encodeURIComponent(schema)}/tables`,
    );

    return response.data.data;
}

export async function fetchTableDetails(
    connectionId: number,
    schema: string,
    table: string,
): Promise<ExplorerTableDetailsDto> {
    const response = await apiClient.get<ExplorerTableDetailsDto>(
        `/connections/${connectionId}/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}`,
    );

    return response.data;
}
