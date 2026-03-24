interface FilterableColumn {
    name: string;
    originalIndex: number;
}

type ResultFilterToken =
    | { type: 'term'; value: string }
    | { type: 'column'; columnName: string; value: string }
    | { type: 'null' }
    | { type: 'not-null' };

const TOKEN_PATTERN = /"([^"]+)"|(\S+)/g;

function normalizeValue(value: unknown): string {
    if (value === null) {
        return 'null';
    }

    if (value === undefined) {
        return 'undefined';
    }

    return String(value).toLowerCase();
}

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
