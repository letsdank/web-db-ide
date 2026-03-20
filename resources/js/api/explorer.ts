import {apiClient} from "./client";
import type {ExplorerColumnDto, ExplorerIndexDto, ExplorerTableDetailsDto, ExplorerTableDto} from "../types/explorer";

interface ExplorerTableApiDto {
    table_name?: unknown;
    table_type?: unknown;
}

interface ExplorerColumnApiDto {
    column_name?: unknown;
    data_type?: unknown;
    is_nullable?: unknown;
    column_default?: unknown;
}

interface ExplorerIndexApiDto {
    indexname?: unknown;
    indexdef?: unknown;
}

interface ExplorerTableDetailsApiDto {
    schema?: unknown;
    table?: unknown;
    columns?: unknown;
    indexes?: unknown;
}

function normalizeExplorerTable(dto: ExplorerTableApiDto): ExplorerTableDto {
    return {
        table_name: typeof dto.table_name === 'string' ? dto.table_name : '',
        table_type: typeof dto.table_type === 'string' ? dto.table_type : '',
    };
}

function normalizeExplorerColumn(dto: ExplorerColumnApiDto): ExplorerColumnDto {
    return {
        column_name: typeof dto.column_name === 'string' ? dto.column_name : '',
        data_type: typeof dto.data_type === 'string' ? dto.data_type : 'unknown',
        is_nullable: String(dto.is_nullable ?? 'YES').toUpperCase() === 'NO' ? 'NO' : 'YES',
        column_default: dto.column_default == null ? null : String(dto.column_default),
    }
}

function normalizeExplorerIndex(dto: ExplorerIndexApiDto): ExplorerIndexDto {
    return {
        indexname: typeof dto.indexname === 'string' ? dto.indexname : '',
        indexdef: typeof dto.indexdef === 'string' ? dto.indexdef : '',
    };
}

function normalizeExplorerTableDetails(dto: ExplorerTableDetailsApiDto): ExplorerTableDetailsDto {
    const columns = Array.isArray(dto.columns) ? dto.columns : [];
    const indexes = Array.isArray(dto.indexes) ? dto.indexes : [];

    return {
        schema: typeof dto.schema === 'string' ? dto.schema : '',
        table: typeof dto.table === 'string' ? dto.table : '',
        columns: columns.map((column) => normalizeExplorerColumn((column ?? {}) as ExplorerColumnApiDto)),
        indexes: indexes.map((index) => normalizeExplorerIndex((index ?? {}) as ExplorerIndexApiDto)),
    };
}

export async function fetchSchemas(connectionId: number): Promise<string[]> {
    const response = await apiClient.get<{ data: unknown[] }>(`/connections/${connectionId}/schemas`);

    return (Array.isArray(response.data.data) ? response.data.data : [])
        .filter((value): value is string => typeof value === 'string');
}

export async function fetchTables(connectionId: number, schema: string): Promise<ExplorerTableDto[]> {
    const response = await apiClient.get<{ data: ExplorerTableDto[] }>(
        `/connections/${connectionId}/schemas/${encodeURIComponent(schema)}/tables`,
    );

    const rows = Array.isArray(response.data.data) ? response.data.data : [];

    return rows.map(normalizeExplorerTable);
}

export async function fetchTableDetails(
    connectionId: number,
    schema: string,
    table: string,
): Promise<ExplorerTableDetailsDto> {
    const response = await apiClient.get<ExplorerTableDetailsDto>(
        `/connections/${connectionId}/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}`,
    );

    return normalizeExplorerTableDetails(response.data);
}

export {
    normalizeExplorerTable,
    normalizeExplorerColumn,
    normalizeExplorerIndex,
    normalizeExplorerTableDetails,
};
