import type * as MonacoNamespace from 'monaco-editor';
import type {ExplorerTableDetailsDto} from "../../../types/explorer";
import {useEffect, useMemo, useRef} from "react";

interface SchemaCompletionItem {
    schema: string;
    table: string;
    columns: { name: string; type: string }[];
}

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

    const dotMatch = linePrefix.match(/(\w+)\.\w*$/);
    if (dotMatch) {
        const prefix = dotMatch[1].toLowerCase();
        const matched = schemaItems.filter(
            (i) => i.table.toLowerCase() === prefix || i.schema.toLowerCase() === prefix,
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

    const isTableCtx = /\b(from|join|update|into|table)\s+[\w.]*$/.test(textBefore);
    const isSelectCtx = /\bselect\b.*$/.test(textBefore);

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

export function useSqlCompletionProvider({monaco, detailsByTableKey, activeConnectionId}: Params) {
    const disposeRef = useRef<MonacoNamespace.IDisposable | null>(null);

    // Recompute only when the active connection's loaded tables actually change.
    // Storing as a ref inside the provider closure avoids re-registering on every
    // detailsByTableKey update - the provider reads the latest ref value on each invocation.
    const schemaItemsRef = useRef<SchemaCompletionItem[]>([]);

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

    // Register provider once per monaco+connection pair - reads schemaItemsRef live,
    // so new tables become available without re-registration.
    useEffect(() => {
        disposeRef.current?.dispose();
        disposeRef.current = null;

        if (!monaco || !activeConnectionId) return;

        disposeRef.current = monaco.languages.registerCompletionItemProvider('sql', {
            triggerCharacters: ['.', ' '],
            provideCompletionItems(model, position) {
                return {
                    suggestions: buildCompletions(monaco, model, position, schemaItemsRef.current),
                };
            },
        });

        return () => {
            disposeRef.current?.dispose();
            disposeRef.current = null;
        }
    }, [monaco, activeConnectionId]); // re-register only when connection changes
}
