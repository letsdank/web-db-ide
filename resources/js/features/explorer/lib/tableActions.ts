import type {DatabaseDriver} from "../../../types/connection";
import {buildCountSql, buildPreviewSql, buildSelectSql} from "./sql";
import type {ExplorerColumnDto} from "../../../types/explorer";

export interface ExplorerTableActionPayload {
    connectionId: number;
    driver: DatabaseDriver;
    schema: string | null;
    table: string;
}

export interface ExplorerCreateTabInput {
    title: string;
    sql_text: string;
    db_connection_id: number;
}

function buildQualifiedLabel(schema: string | null | undefined, table: string): string {
    return schema ? `${schema}.${table}` : table;
}

export function buildExplorerPreviewTabInput(
    payload: ExplorerTableActionPayload,
    limit = 100,
): ExplorerCreateTabInput {
    return {
        title: `${payload.table} Preview`,
        sql_text: buildPreviewSql(payload.driver, payload.schema, payload.table, limit),
        db_connection_id: payload.connectionId,
    };
}

export function buildExplorerCountTabInput(
    payload: ExplorerTableActionPayload,
): ExplorerCreateTabInput {
    return {
        title: `${payload.table} Count`,
        sql_text: buildCountSql(payload.driver, payload.schema, payload.table),
        db_connection_id: payload.connectionId,
    };
}

export function buildExplorerSelectSql(
    payload: ExplorerTableActionPayload,
): string {
    return buildSelectSql(payload.driver, payload.schema, payload.table);
}

export function formatExplorerColumnLine(column: ExplorerColumnDto): string {
    const dataType = column.data_type ?? 'unknown';
    const notNullSuffix = column.is_nullable === 'NO' ? ' not null' : '';
    const defaultSuffix = column.column_default ? ` default ${column.column_default}` : '';

    return `${column.column_name} ${dataType}${notNullSuffix}${defaultSuffix}`;
}

export function buildExplorerMetadataSqlText(
    schema: string | null | undefined,
    table: string,
    columns: ExplorerColumnDto[],
): string {
    const header = `-- ${buildQualifiedLabel(schema, table)}`;

    if (columns.length === 0) {
        return `${header}\n-- no columns available`;
    }

    return `${header}\n${columns.map(formatExplorerColumnLine).join('\n')}`;
}

export function buildExplorerMetadataTabInput(
    payload: ExplorerTableActionPayload,
    columns: ExplorerColumnDto[],
): ExplorerCreateTabInput {
    return {
        title: `${payload.table} Columns`,
        sql_text: buildExplorerMetadataSqlText(payload.schema, payload.table, columns),
        db_connection_id: payload.connectionId,
    };
}
