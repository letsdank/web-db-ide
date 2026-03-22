import type * as MonacoNamespace from 'monaco-editor';
import type {ExplorerTableDetailsDto} from "../../../types/explorer";
import {useEffect, useMemo, useRef} from "react";
import type { SchemaCompletionItem} from "../lib/sqlCompletions";
import {extractAliases, isSelectContext, isTableContext} from "../lib/sqlCompletions";

function buildCompletions(
    monaco: typeof MonacoNamespace,
    model: MonacoNamespace.editor.ITextModel,
    position: MonacoNamespace.Position,
    schemaItems: SchemaCompletionItem[],
): MonacoNamespace.languages.CompletionItem[] {
    const word = model.getWordUntilPosition(position);
    const range: MonacoNamespace.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
    };

    const linePrefix = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
    });

    // After "table." or "alias." - suggest columns
    const dotMatch = linePrefix.match(/(\w+)\.\w*$/);
    if (dotMatch) {
        const prefix = dotMatch[1].toLowerCase();

        // Get full query text up to cursor for alias resolution
        const fullText = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
        });

        const aliases = extractAliases(fullText);

        // Resolve alias to table name, fall back to prefix as-is
        const resolvedTable = aliases.get(prefix) ?? prefix;

        const matched = schemaItems.filter(
            (i) => i.table.toLowerCase() === resolvedTable || i.schema.toLowerCase() === resolvedTable,
        );
        const source = matched.length > 0 ? matched : schemaItems;

        return source.flatMap((i) =>
            i.columns.map((col) => ({
                label: col.name,
                kind: monaco.languages.CompletionItemKind.Field,
                detail: matched.length > 0 ? col.type : `${i.table} · ${col.type}`,
                insertText: col.name,
                range,
                sortText: `0_${col.name}`,
            })),
        );
    }

    const textBefore = model
        .getValueInRange({
            startLineNumber: Math.max(1, position.lineNumber - 3),
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
        })
        .toLowerCase();

    const isTableCtx = isTableContext(textBefore);
    const isSelectCtx = isSelectContext(textBefore);

    const result: MonacoNamespace.languages.CompletionItem[] = [];

    for (const item of schemaItems) {
        const sort = isTableCtx ? '0' : '2';
        result.push({
            label: `${item.schema}.${item.table}`,
            kind: monaco.languages.CompletionItemKind.Class,
            detail: `table · ${item.columns.length} cols`,
            insertText: `${item.schema}.${item.table}`,
            range,
            sortText: `${sort}_${item.schema}_${item.table}`,
        });
        result.push({
            label: item.table,
            kind: monaco.languages.CompletionItemKind.Class,
            detail: `${item.schema} · ${item.columns.length} cols`,
            insertText: item.table,
            range,
            sortText: `${sort}_${item.table}`,
        });
    }

    if (isSelectCtx) {
        const seen = new Set<string>();
        for (const item of schemaItems) {
            for (const col of item.columns) {
                if (!seen.has(col.name)) {
                    seen.add(col.name);
                    result.push({
                        label: col.name,
                        kind: monaco.languages.CompletionItemKind.Field,
                        detail: `${item.table} · ${col.type}`,
                        insertText: col.name,
                        range,
                        sortText: `1_${col.name}`,
                    });
                }
            }
        }
    }

    return result;
}

interface Params {
    monaco: typeof MonacoNamespace | null;
    detailsByTableKey: Record<string, ExplorerTableDetailsDto>;
    activeConnectionId: number | null;
}

/**
 * Registers a Monaco SQL completion provider scoped to the active connection.
 * The provider reads schema items via a ref, so switching connections or loading
 * new table details takes effect immediately without re-registration.
 */
export function useSqlCompletionProvider({monaco, detailsByTableKey, activeConnectionId}: Params) {
    const disposeRef = useRef<MonacoNamespace.IDisposable | null>(null);

    // Both refs are read inside the provider closure on every completion request,
    // so switching connections or loading new tables is reflected immediately
    // without re-registering the provider.
    const schemaItemsRef = useRef<SchemaCompletionItem[]>([]);
    const activeConnectionIdRef = useRef<number | null>(null);

    activeConnectionIdRef.current = activeConnectionId;

    schemaItemsRef.current = useMemo(() => {
        if (!activeConnectionId) return [];

        return Object.entries(detailsByTableKey)
            .filter(([key]) => Number(key.split(':')[0]) === activeConnectionId)
            .map(([, details]) => ({
                schema: details.schema,
                table: details.table,
                columns: details.columns.map((col) => ({
                    name: col.column_name,
                    type: col.data_type,
                })),
            }));
    }, [detailsByTableKey, activeConnectionId]);

    // Register provider once per monaco instance - both schema and active connection
    // are read via refs so no re-registration needed on connection switch.
    useEffect(() => {
        disposeRef.current?.dispose();
        disposeRef.current = null;

        if (!monaco) return;

        disposeRef.current = monaco.languages.registerCompletionItemProvider('sql', {
            triggerCharacters: ['.'],
            provideCompletionItems(model, position) {
                if (!activeConnectionIdRef.current) return {suggestions: []};
                return {
                    suggestions: buildCompletions(monaco, model, position, schemaItemsRef.current),
                };
            },
        });

        return () => {
            disposeRef.current?.dispose();
            disposeRef.current = null;
        }
    }, [monaco]); // register exactly once when monaco mounts
}
