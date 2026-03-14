import {ConnectionDto, CreateConnectionPayload, UpdateConnectionPayload} from "../types/connection";
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

export async function deleteConnection(id:number):Promise<void>{
    await apiClient.delete(`/connections/${id}`);
}
