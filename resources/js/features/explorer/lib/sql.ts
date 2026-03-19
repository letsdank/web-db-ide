import type {DatabaseDriver} from "../../../types/connection";

function quoteIdentifierPart(driver: DatabaseDriver, value: string): string {
    if (driver === 'mysql') {
        return `\`${value.replace(/`/g, '``')}\``;
    }

    return `"${value.replace(/"/g, '""')}"`;
}

export function qualifyTableName(
    driver: DatabaseDriver,
    schema: string | null | undefined,
    table: string
): string {
    const quotedTable = quoteIdentifierPart(driver, table);

    if (!schema) {
        return quotedTable;
    }

    return `${quoteIdentifierPart(driver, schema)}.${quotedTable}`;
}

export function buildPreviewSql(
    driver: DatabaseDriver,
    schema: string | null | undefined,
    table: string,
    limit = 100,
): string {
    return `select *
from ${qualifyTableName(driver, schema, table)}
limit ${limit};`;
}

export function buildCountSql(
    driver: DatabaseDriver,
    schema: string | null | undefined,
    table: string): string {
    return `select count(*) as total_rows
from ${qualifyTableName(driver, schema, table)};`;
}

export function buildSelectSql(
    driver: DatabaseDriver,
    schema: string | null | undefined,
    table: string): string {
    return `select *
from ${qualifyTableName(driver, schema, table)};`;
}
