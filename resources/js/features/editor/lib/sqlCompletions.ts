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
