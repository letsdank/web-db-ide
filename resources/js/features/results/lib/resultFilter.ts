/**
 * Minimal column shape required by the client-side result filter.
 *
 * `originalIndex` is used to read the actual cell value from a positional row.
 */
interface FilterableColumn {
    name: string;
    originalIndex: number;
}

/**
 * Parsed representation of the supported result-filter syntax.
 *
 * Supported token kinds:
 * - plain term: searches across all visible columns
 * - column:value: limits search to one named column
 * - is:null / is:not-null: nullability checks across visible columns
 */
type ResultFilterToken =
    | { type: 'term'; value: string }
    | { type: 'column'; columnName: string; value: string }
    | { type: 'null' }
    | { type: 'not-null' };

/**
 * Splits the filter string into tokens while preserving quoted phrases.
 */
const TOKEN_PATTERN = /"([^"]+)"|(\S+)/g;

/**
 * Normalizes cell values into a case-insensitive comparable string.
 *
 * `null` and `undefined` are mapped explicitly so filter operators can match
 * them consistently in the grid.
 */
function normalizeValue(value: unknown): string {
    if (value === null) {
        return 'null';
    }

    if (value === undefined) {
        return 'undefined';
    }

    return String(value).toLowerCase();
}

/**
 * Tokenizes raw filter input into plain string segments.
 *
 * Quoted substrings are preserved as a single token.
 */
function tokenizeFilter(input: string): string[] {
    const tokens: string[] = [];

    for (const match of input.matchAll(TOKEN_PATTERN)) {
        const token = match[1] ?? match[2] ?? '';
        const normalized = token.trim();

        if (normalized) {
            tokens.push(normalized);
        }
    }

    return tokens;
}

/**
 * Parses the user-entered filter string into structured filter tokens.
 *
 * Examples:
 * - `alice`
 * - `name:alice`
 * - `"alice cooper"`
 * - `is:null`
 */
export function parseResultFilter(input: string): ResultFilterToken[] {
    return tokenizeFilter(input).map((token) => {
        const normalizedToken = token.toLowerCase();

        if (normalizedToken === 'is:null') {
            return {type: 'null'}satisfies ResultFilterToken;
        }

        if (normalizedToken === 'is:not-null') {
            return {type: 'not-null'}satisfies ResultFilterToken;
        }

        const separatorIndex = token.indexOf(':');

        if (separatorIndex > 0 && separatorIndex < token.length - 1) {
            return {
                type: 'column',
                columnName: token.slice(0, separatorIndex).trim().toLowerCase(),
                value: token.slice(separatorIndex + 1).trim().toLowerCase(),
            } satisfies ResultFilterToken;
        }

        return {
            type: 'term',
            value: token.toLowerCase(),
        }satisfies ResultFilterToken;
    });
}

/**
 * Returns true when a row satisfies every token in the parsed filter.
 *
 * Matching is performed only against currently visible columns so hidden
 * columns do not unexpectedly affect the filtered result set.
 */
export function rowMatchesResultFilter(
    row: unknown[],
    columns: FilterableColumn[],
    filter: string,
): boolean {
    const tokens = parseResultFilter(filter);

    if (tokens.length === 0) {
        return true;
    }

    return tokens.every((token) => {
        if (token.type === 'null') {
            return columns.some((column) => row[column.originalIndex] === null);
        }

        if (token.type === 'not-null') {
            return columns.some((column) => row[column.originalIndex] !== null);
        }

        if (token.type === 'column') {
            const column = columns.find((item) => item.name.toLowerCase() === token.columnName);

            if (!column) {
                return false;
            }

            return normalizeValue(row[column.originalIndex]).includes(token.value);
        }

        return columns.some((column) => normalizeValue(row[column.originalIndex]).includes(token.value));
    });
}
