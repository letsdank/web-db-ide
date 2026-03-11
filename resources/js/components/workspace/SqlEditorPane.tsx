import {useMemo} from "react";
import type * as MonacoNamespace from "monaco-editor"
import {Editor, OnMount} from "@monaco-editor/react";
import {Card} from "@gravity-ui/uikit";

interface EditorSelectionPayload {
    selectedText: string | null;
    cursorPosition: {
        lineNumber: number;
        column: number;
    } | null;
    selectionRange: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
    } | null;
}

interface Props {
    value: string;
    onChange: (value: string) => void;
    onSelectionChange: (payload: EditorSelectionPayload) => void;
    onRun: () => void;
}

export function SqlEditorPane({
                                  value,
                                  onChange,
                                  onSelectionChange,
                                  onRun
                              }: Props) {
    const options = useMemo<MonacoNamespace.editor.IStandaloneEditorConstructionOptions>(() => ({
        minimap: {enabled: false},
        fontSize: 14,
        lineHeight: 22,
        fontLigatures: true,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'off',
        tabSize: 4,
        insertSpaces: true,
        padding: {
            top: 12,
            bottom: 12,
        },
        suggest: {
            showKeywords: true,
            showSnippets: true,
        },
        quickSuggestions: {
            other: true,
            comments: false,
            string: false,
        },
    }), []);

    const handleMount: OnMount = (editor, monaco) => {
        monaco.editor.defineTheme('web-db-ide-sql', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                {token: 'keyword', foreground: '7AA2F7'},
                {token: 'string', foreground: '9ECE6A'},
                {token: 'comment', foreground: '6B7280'},
                {token: 'number', foreground: 'FF9E64'},
            ],
            colors: {
                'editor.background': '#15171a',
                'editorLineNumber.foreground': '#6b7280',
                'editorLineNumber.activeForeground': '#cbd5e1',
                'editorCursor.foreground': '#ffffff',
                'editor.selectionBackground': '#264f78',
                'editor.lineHighlightBackground': '#1d2127',
            },
        });

        monaco.editor.setTheme('web-db-ide-sql');

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            onRun();
        });

        const pushSelectionState = () => {
            const selection = editor.getSelection();
            const model = editor.getModel();

            if (!selection || !model) {
                onSelectionChange({
                    selectedText: null,
                    cursorPosition: null,
                    selectionRange: null,
                });
                return;
            }

            const selectedText = model.getValueInRange(selection).trim();

            onSelectionChange({
                selectedText: selectedText.length > 0 ? selectedText : null,
                cursorPosition: {
                    lineNumber: selection.positionLineNumber,
                    column: selection.positionColumn,
                },
                selectionRange: {
                    startLineNumber: selection.startLineNumber,
                    startColumn: selection.startColumn,
                    endLineNumber: selection.endLineNumber,
                    endColumn: selection.endColumn,
                },
            });
        };

        pushSelectionState();

        editor.onDidChangeCursorSelection(() => {
            pushSelectionState();
        });
    }

    return (
        <Card
            view="filled"
            style={{
                height: '100%',
                padding: 12,
                overflow: 'hidden',
                boxSizing: 'border-box',
            }}
        >
            <div style={{height: '100%', borderRadius: 10, overflow: 'hidden'}}>
                <Editor
                    height="100%"
                    defaultLanguage="sql"
                    value={value}
                    onChange={(next) => onChange(next ?? '')}
                    onMount={handleMount}
                    options={options}
                />
            </div>
        </Card>
    )
}
