import type {DatabaseDriver} from "../../../types/connection";

export interface SchemaCompletionItem {
    schema: string;
    table: string;
    columns: { name: string; type: string }[];
}

export function extractAliases(sql: string): Map<string, string> {
    const aliases = new Map<string, string>();
    const pattern = /\b(?:from|join)\s+["'`]?(\w+)["'`]?\s+(?:as\s+)?["'`]?(\w+)["'`]?/gi;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(sql)) !== null) {
        const table = match[1].toLowerCase();
        const alias = match[2].toLowerCase();

        if (/^(where|on|set|left|right|inner|outer|cross|full|group|order|limit|having)$/.test(alias)) {
            continue;
        }

        aliases.set(alias, table);
    }

    return aliases;
}

export function resolveTablePrefix(
    prefix: string,
    sql: string,
    schemaItems: SchemaCompletionItem[],
): SchemaCompletionItem[] {
    const aliases = extractAliases(sql);
    const resolvedTable = aliases.get(prefix.toLowerCase()) ?? prefix.toLowerCase();

    const matched = schemaItems.filter(
        (i) => i.table.toLowerCase() === resolvedTable || i.schema.toLowerCase() === resolvedTable,
    );

    return matched.length > 0 ? matched : schemaItems;
}

export function isTableContext(textBefore: string): boolean {
    return /\b(from|join|update|into|table)\s+[\w.]*$/i.test(textBefore);
}

export function isSelectContext(textBefore: string): boolean {
    return /\bselect\b.*$/i.test(textBefore);
}

//-----------------------------------------------------------------------------
// Keyword snippets
//-----------------------------------------------------------------------------

export interface KeywordSnippet {
    label: string;
    insertText: string;
    detail: string;
    /** Monaco InsertTextRule - 4 = InsertAsSnippet */
    insertTextRule: 4;
}

// Common SQL keywords with tab-stop snippets ($1, $2, ...)
const COMMON_KEYWORD_SNIPPETS: KeywordSnippet[] = [
    {
        label: 'SELECT',
        insertText: 'SELECT $2\nFROM $1',
        detail: 'SELECT ... FROM',
        insertTextRule: 4,
    },
    {
        label: 'SELECT *',
        insertText: 'SELECT *\nFROM $1',
        detail: 'SELECT * FROM ...',
        insertTextRule: 4,
    },
    {
        label: 'SELECT DISTINCT',
        insertText: 'SELECT DISTINCT $2\nFROM $1',
        detail: 'SELECT DISTINCT ... FROM',
        insertTextRule: 4,
    },
    {
        label: 'WHERE',
        insertText: 'WHERE $1',
        detail: 'WHERE clause',
        insertTextRule: 4,
    },
    {
        label: 'JOIN',
        insertText: 'JOIN $1 ON $2.$3 = $4.$5',
        detail: 'INNER JOIN ... ON',
        insertTextRule: 4,
    },
    {
        label: 'LEFT JOIN',
        insertText: 'LEFT JOIN $1 ON $2.$3 = $4.$5',
        detail: 'LEFT JOIN ... ON',
        insertTextRule: 4,
    },
    {
        label: 'LEFT JOIN LATERAL',
        insertText: 'LEFT JOIN LATERAL (\n\t$1\n) $2 ON TRUE',
        detail: 'LEFT JOIN LATERAL (subquery)',
        insertTextRule: 4,
    },
    {
        label: 'GROUP BY',
        insertText: 'GROUP BY $1',
        detail: 'GROUP BY clause',
        insertTextRule: 4,
    },
    {
        label: 'ORDER BY',
        insertText: 'ORDER BY $1 ${2|ASC,DESC|}',
        detail: 'ORDER BY ... ASC/DESC',
        insertTextRule: 4,
    },
    {
        label: 'HAVING',
        insertText: 'HAVING $1',
        detail: 'HAVING clause',
        insertTextRule: 4,
    },
    {
        label: 'LIMIT',
        insertText: 'LIMIT $1',
        detail: 'LIMIT rows',
        insertTextRule: 4,
    },
    {
        label: 'OFFSET',
        insertText: 'OFFSET $1',
        detail: 'OFFSET rows',
        insertTextRule: 4,
    },
    {
        label: 'INSERT INTO',
        insertText: 'INSERT INTO $1 ($2)\nVALUES ($3)',
        detail: 'INSERT INTO ... VALUES',
        insertTextRule: 4,
    },
    {
        label: 'UPDATE',
        insertText: 'UPDATE $1\nSET $2 = $3\nWHERE $4',
        detail: 'UPDATE ... SET ... WHERE',
        insertTextRule: 4,
    },
    {
        label: 'DELETE FROM',
        insertText: 'DELETE FROM $1\nWHERE $2',
        detail: 'DELETE FROM ... WHERE',
        insertTextRule: 4,
    },
    {
        label: 'WITH',
        insertText: 'WITH $1 AS (\n\t$2\n)\n$3',
        detail: 'CTE - WITH ... AS (...)',
        insertTextRule: 4,
    },
    {
        label: 'CASE',
        insertText: 'CASE\n\tWHEN $1 THEN $2\n\tELSE $3\nEND',
        detail: 'CASE WHEN ... THEN ... END',
        insertTextRule: 4,
    },
    {
        label: 'UNION ALL',
        insertText: 'UNION ALL\nSELECT $1',
        detail: 'UNION ALL',
        insertTextRule: 4,
    },
];

//-----------------------------------------------------------------------------
// DB functions per driver
//-----------------------------------------------------------------------------

export interface DbFunction {
    label: string;
    insertText: string;
    detail: string;
    documentation?: string;
    insertTextRule: 4;
}

const COMMON_FUNCTIONS: DbFunction[] = [
    // Aggregate
    {label: 'COUNT(*)', insertText: 'COUNT(*)', detail: 'Count all rows', insertTextRule: 4},
    {label: 'COUNT', insertText: 'COUNT($1)', detail: 'Count non-null values', insertTextRule: 4},
    {label: 'SUM', insertText: 'SUM($1)', detail: 'Sum of values', insertTextRule: 4},
    {label: 'AVG', insertText: 'AVG($1)', detail: 'Average of values', insertTextRule: 4},
    {label: 'MIN', insertText: 'MIN($1)', detail: 'Minimum value', insertTextRule: 4},
    {label: 'MAX', insertText: 'MAX($1)', detail: 'Maximum value', insertTextRule: 4},
    // Conditional
    {label: 'COALESCE', insertText: 'COALESCE($1, $2)', detail: 'First non-null value', insertTextRule: 4},
    {label: 'NULLIF', insertText: 'NULLIF($1, $2)', detail: 'NULL if values are equal', insertTextRule: 4},
    {
        label: 'CASE',
        insertText: 'CASE WHEN $1 THEN $2 ELSE $3 END',
        detail: 'Conditional expression',
        insertTextRule: 4
    },
    // String
    {label: 'LOWER', insertText: 'LOWER($1)', detail: 'Convert to lowercase', insertTextRule: 4},
    {label: 'UPPER', insertText: 'UPPER($1)', detail: 'Convert to uppercase', insertTextRule: 4},
    {label: 'TRIM', insertText: 'TRIM($1)', detail: 'Remove whitespace', insertTextRule: 4},
    {label: 'LENGTH', insertText: 'LENGTH($1)', detail: 'String length', insertTextRule: 4},
    {label: 'SUBSTRING', insertText: 'SUBSTRING($1, $2, $3)', detail: 'Extract substring', insertTextRule: 4},
    {label: 'REPLACE', insertText: 'REPLACE($1, $2, $3)', detail: 'Replace occurrences', insertTextRule: 4},
    // Math
    {label: 'ROUND', insertText: 'ROUND($1, $2)', detail: 'Round to N decimals', insertTextRule: 4},
    {label: 'FLOOR', insertText: 'FLOOR($1)', detail: 'Round down', insertTextRule: 4},
    {label: 'CEIL', insertText: 'CEIL($1)', detail: 'Round up', insertTextRule: 4},
    {label: 'ABS', insertText: 'ABS($1)', detail: 'Absolute value', insertTextRule: 4},
];

const POSTGRES_FUNCTIONS: DbFunction[] = [
    ...COMMON_FUNCTIONS,
    // Date/time
    {label: 'NOW()', insertText: 'NOW()', detail: 'Current timestamp with timezone', insertTextRule: 4},
    {label: 'CURRENT_DATE', insertText: 'CURRENT_DATE', detail: 'Current date', insertTextRule: 4},
    {label: 'CURRENT_TIMESTAMP', insertText: 'CURRENT_TIMESTAMP', detail: 'Current timestamp', insertTextRule: 4},
    {
        label: 'DATE_TRUNC',
        insertText: "DATE_TRUNC('${1|year,month,week,day,hour,minute|}', $2)",
        detail: 'Truncate timestamp to unit',
        insertTextRule: 4
    },
    {
        label: 'EXTRACT',
        insertText: "EXTRACT(${1|year,month,day,hour,minute,second|} FROM $2",
        detail: 'Extract date part',
        insertTextRule: 4
    },
    {label: 'AGE', insertText: 'AGE($1, $2)', detail: 'Interval between timestamps', insertTextRule: 4},
    {label: 'TO_TIMESTAMP', insertText: 'TO_TIMESTAMP($1)', detail: 'Unix timestamp to timestamptz', insertTextRule: 4},
    // String (Postgres-specific)
    {label: 'CONCAT', insertText: 'CONCAT($1, $2)', detail: 'Concatenate strings', insertTextRule: 4},
    {label: 'CONCAT_WS', insertText: "CONCAT_WS('$1', $2)", detail: 'Concatenate with separator', insertTextRule: 4},
    {label: 'STRING_AGG', insertText: "STRING_AGG($1, '$2')", detail: 'Aggregate strings', insertTextRule: 4},
    {label: 'ARRAY_AGG', insertText: 'ARRAY_AGG($1)', detail: 'Aggregate into array', insertTextRule: 4},
    {label: 'JSONB_AGG', insertText: 'JSONB_AGG($1)', detail: 'Aggregate into JSONB array', insertTextRule: 4},
    {
        label: 'JSONB_BUILD_OBJECT',
        insertText: "JSONB_BUILD_OBJECT('$1', $2)",
        detail: 'Build JSONB object',
        insertTextRule: 4
    },
    {label: 'ROW_NUMBER()', insertText: 'ROW_NUMBER() OVER ($1)', detail: 'Window: row number', insertTextRule: 4},
    {label: 'RANK()', insertText: 'RANK() OVER ($1)', detail: 'Window: rank with gaps', insertTextRule: 4},
    {
        label: 'DENSE_RANK()',
        insertText: 'DENSE_RANK() OVER ($1)',
        detail: 'Window: rank without gaps',
        insertTextRule: 4
    },
    {label: 'LAG', insertText: 'LAG($1, $2) OVER ($3)', detail: 'Window: previous row value', insertTextRule: 4},
    {label: 'LEAD', insertText: 'LEAD($1, $2) OVER ($3)', detail: 'Window: next row value', insertTextRule: 4},
    {label: 'GEN_RANDOM_UUID()', insertText: 'GEN_RANDOM_UUID()', detail: 'Generate UUID v4', insertTextRule: 4},
];

const MYSQL_FUNCTIONS: DbFunction[] = [
    ...COMMON_FUNCTIONS,
    // Date/time
    {label: 'NOW()', insertText: 'NOW()', detail: 'Current datetime', insertTextRule: 4},
    {label: 'CURDATE()', insertText: 'CURDATE()', detail: 'Current date', insertTextRule: 4},
    {label: 'CURTIME()', insertText: 'CURTIME()', detail: 'Current time', insertTextRule: 4},
    {label: 'DATE_FORMAT', insertText: "DATE_FORMAT($1, '$2')", detail: 'Format date', insertTextRule: 4},
    {
        label: 'DATE_ADD',
        insertText: 'DATE_ADD($1, INTERVAL $2 ${3|DAY,MONTH,YEAR,HOUR,MINUTE|})',
        detail: 'Add interval to date',
        insertTextRule: 4
    },
    {label: 'DATEDIFF', insertText: 'DATEDIFF($1, $2)', detail: 'Days between dates', insertTextRule: 4},
    {label: 'UNIX_TIMESTAMP', insertText: 'UNIX_TIMESTAMP($1)', detail: 'Date to unix timestamp', insertTextRule: 4},
    {label: 'FROM_UNIXTIME', insertText: 'FROM_UNIXTIEM($1)', detail: 'Unix timestamp to datetime', insertTextRule: 4},
    // String
    {label: 'CONCAT', insertText: 'CONCAT($1, $2)', detail: 'Concatenate strings', insertTextRule: 4},
    {
        label: 'GROUP_CONCAT',
        insertText: "GROUP_CONCAT($1 SEPARATOR '$2')",
        detail: 'Aggregate strings',
        insertTextRule: 4
    },
    {label: 'IF', insertText: 'IF($1, $2, $3)', detail: 'Conditional: IF(cond, true, false)', insertTextRule: 4},
    {label: 'IFNULL', insertText: 'IFNULL($1, $2)', detail: 'Replace NULL with value', insertTextRule: 4},
    {label: 'UUID()', insertText: 'UUID()', detail: 'Generate UUID', insertTextRule: 4},
    {label: 'JSON_OBJECT', insertText: "JSON_OBJECT('$1', $2)", detail: 'Build JSON object', insertTextRule: 4},
    {label: 'JSON_ARRAYAGG', insertText: 'JSON_ARRAYAGG($1)', detail: 'Aggregate into JSON array', insertTextRule: 4},
    {label: 'ROW_NUMBER()', insertText: 'ROW_NUMBER() OVER ($1)', detail: 'Window: row number', insertTextRule: 4},
];

const SQLITE_FUNCTIONS: DbFunction[] = [
    ...COMMON_FUNCTIONS,
    {label: 'DATE()', insertText: "DATE('now')", detail: 'Current date', insertTextRule: 4},
    {label: 'DATETIME()', insertText: "DATETIME('now')", detail: 'Current datetime', insertTextRule: 4},
    {label: 'STRFTIME', insertText: "STRFTIME('$1', $2)", detail: 'Format datetime', insertTextRule: 4},
    {label: 'TYPEOF', insertText: 'TYPEOF($1)', detail: 'Type of value', insertTextRule: 4},
    {label: 'PRINTF', insertText: "PRINTF('$1', $2)", detail: 'Formatted string', insertTextRule: 4},
    {label: 'RANDOM()', insertText: 'RANDOM()', detail: 'Random integer', insertTextRule: 4},
    {label: 'HEX', insertText: 'HEX($1)', detail: 'Hex representation', insertTextRule: 4},
    {label: 'GROUP_CONCAT', insertText: "GROUP_CONCAT($1, '$2')", detail: 'Aggregate strings', insertTextRule: 4},
    {label: 'IIF', insertText: 'IIF($1, $2, $3)', detail: 'Inline IF (SQLite 3.32+)', insertTextRule: 4},
];

export function getDbFunctions(driver: DatabaseDriver | string | null | undefined): DbFunction[] {
    switch (driver) {
        case 'pgsql':
            return POSTGRES_FUNCTIONS;
        case 'mysql':
            return MYSQL_FUNCTIONS;
        case 'sqlite':
            return SQLITE_FUNCTIONS;
        default:
            return COMMON_FUNCTIONS;
    }
}

export function getKeywordSnippets(): KeywordSnippet[] {
    return COMMON_KEYWORD_SNIPPETS;
}
