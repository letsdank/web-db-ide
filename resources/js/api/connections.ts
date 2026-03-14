import {
    ConnectionDto,
    CreateConnectionPayload,
    TestConnectionResultDto,
    UpdateConnectionPayload
} from "../types/connection";
import {apiClient} from "./client";

export async function fetchConnections(): Promise<ConnectionDto[]> {
    const response = await apiClient.get<{ data: ConnectionDto[] }>('/connections');

    return response.data.data;
}

export async function createConnection(payload: CreateConnectionPayload): Promise<ConnectionDto> {
    const response = await apiClient.post<{ data: ConnectionDto }>('/connections', payload,);

    return response.data.data;
}

export async function updateConnection(id: number, payload: UpdateConnectionPayload): Promise<ConnectionDto> {
    const response = await apiClient.patch<{ data: ConnectionDto }>(`/connections/${id}`, payload);

    return response.data.data;
}

export async function deleteConnection(id: number): Promise<void> {
    await apiClient.delete(`/connections/${id}`);
}

export async function testConnection(
    payload: CreateConnectionPayload | UpdateConnectionPayload,
): Promise<TestConnectionResultDto> {
    const response = await apiClient.post<{ data: TestConnectionResultDto }>('/connections/test', payload);

    return response.data.data;
}

export async function testExistingConnection(
    id: number,
    payload: CreateConnectionPayload | UpdateConnectionPayload,
): Promise<TestConnectionResultDto> {
    const response = await apiClient.post<{ data: TestConnectionResultDto }>(`/connections/${id}/test`, payload);

    return response.data.data;
}
