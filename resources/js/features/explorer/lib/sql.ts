function quoteIdentifierPart(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
}

export function qualifyTableName(schema: string | null | undefined, table: string): string {
    const quotedTable = quoteIdentifierPart(table);

    if (!schema) {
        return quotedTable;
    }

    return `${quoteIdentifierPart(schema)}.${quotedTable}`;
}

export function buildPreviewSql(
    schema: string | null | undefined,
    table: string,
    limit = 100,
): string {
    return `select *
from ${qualifyTableName(schema, table)}
limit ${limit};`;
}

export function buildCountSql(schema: string | null | undefined, table: string): string {
    return `select count(*) as total_rows
from ${qualifyTableName(schema, table)};`;
}

export function buildSelectSql(schema: string | null | undefined, table: string): string {
    return `select *
from ${qualifyTableName(schema, table)};`;
}
