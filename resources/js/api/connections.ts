import {ConnectionDto} from "../types/connection";
import {apiClient} from "./client";

export interface CreateConnectionPayload {
    name: string;
    driver: string;
    host: string;
    port: number;
    database_name: string;
    username: string;
    password: string;
    ssl_mode?: string | null;
    schema_default?: string | null;
    color?: string | null;
    is_read_only?: boolean;
}

export async function fetchConnections(): Promise<ConnectionDto[]> {
    const response = await apiClient.get<{ data: ConnectionDto[] }>('/connections');

    return response.data.data;
}

export async function createConnection(
    payload:CreateConnectionPayload
):Promise<ConnectionDto>{
    const response = await apiClient.post<{data:ConnectionDto}>(
        '/connections',
        payload,
    );

    return response.data.data;
}
