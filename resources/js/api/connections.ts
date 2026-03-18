import type {
    ConnectionDto,
    CreateConnectionPayload, ExportConnectionDumpPayload,
    TestConnectionResultDto,
    UpdateConnectionPayload
} from "../types/connection";
import {apiClient} from "./client";
import axios from "axios";
import {downloadBlob} from "../features/results/utils/resultExport";

export async function fetchConnections(): Promise<ConnectionDto[]> {
    const response = await apiClient.get<{ data: ConnectionDto[] }>('/connections');

    return response.data.data;
}

export async function createConnection(payload: CreateConnectionPayload): Promise<ConnectionDto> {
    const response = await apiClient.post<{ data: ConnectionDto }>('/connections', payload);

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

function extractFilenameFromDisposition(contentDisposition?: string): string | null {
    if (!contentDisposition) {
        return null;
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        return decodeURIComponent(utf8Match[1]);
    }

    const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    return plainMatch?.[1] ?? null;
}

async function normalizeBlobAxiosError(error: unknown): Promise<never> {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        try {
            const text = await error.response.data.text();
            const parsed = JSON.parse(text) as {
                message?: string;
                errors?: Record<string, string[]>;
            };

            const firstError = parsed.errors
                ? Object.values(parsed.errors)[0]?.[0]
                : null;

            throw new Error(firstError || parsed.message || 'Failed to export dump.');
        } catch {
            throw new Error('Failed to export dump.');
        }
    }

    throw error;
}

export async function exportConnectinDump(
    id: number,
    payload: ExportConnectionDumpPayload,
): Promise<void> {
    try {
        const response = await apiClient.post(
            `/connections/${id}/dump`,
            payload,
            {
                responseType: 'blob',
            },
        );

        const filename = extractFilenameFromDisposition(
            response.headers['content-disposition'] as string | undefined,
        ) ?? 'database-dump.sql';

        const blob = new Blob(
            [response.data],
            {
                type: (response.headers['content-type'] as string | undefined) ?? 'application/octet-stream',
            },
        );

        downloadBlob(filename, blob);
    } catch (error) {
        await normalizeBlobAxiosError(error);
    }
}
