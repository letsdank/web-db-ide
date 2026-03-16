import {Card, Label, Text} from "@gravity-ui/uikit";
import {useI18n} from "../../i18n";

interface Props {
    connectionName: string | null;
    resultLimit: number | null;
    cursorLine: number | null;
    cursorColumn: number | null;
    selectedText: string | null;
    selectedLineCount: number | null;
    isExecuting: boolean;
    rowsCount: number | null;
    hasMoreRows: boolean;
}

function StatusMeta({
                        label,
                        value
                    }: {
    label: string;
    value: string;
}) {
    return (
        <div className="editor-status-bar__meta">
            <Text variant="body-2" color="secondary">
                {label}
            </Text>

            <Text variant="body-2" className="editor-status-bar__meta-value">
                {value}
            </Text>
        </div>
    );
}

export function EditorStatusBar({
                                    connectionName,
                                    resultLimit,
                                    cursorLine,
                                    cursorColumn,
                                    selectedText,
                                    selectedLineCount,
                                    isExecuting,
                                    rowsCount,
                                    hasMoreRows
                                }: Props) {
    const hasSelection = Boolean(selectedText?.trim().length);
    const {t} = useI18n();

    return (
        <Card view="filled" className="editor-status-bar__card">
            <div className="editor-status-bar__content">
                <div className="editor-status-bar__group">
                    <Label theme={connectionName ? "info" : "utility"}>
                        {connectionName || t('workspace.noConnection')}
                    </Label>

                    <StatusMeta
                        label="Limit"
                        value={resultLimit ? String(resultLimit) : "-"}
                    />

                    <StatusMeta
                        label="Cursor"
                        value={
                            cursorLine !== null && cursorColumn !== null
                                ? `Ln ${cursorLine}, Col ${cursorColumn}`
                                : "-"
                        }
                    />

                    <StatusMeta
                        label="Selection"
                        value={
                            hasSelection
                                ? selectedLineCount && selectedLineCount > 1
                                    ? `${selectedLineCount} lines`
                                    : "1 line"
                                : t('workspace.none')
                        }
                    />
                </div>

                <div className="editor-status-bar__group">
                    <StatusMeta
                        label={t('workspace.rows')}
                        value={
                            rowsCount !== null
                                ? `${rowsCount}${hasMoreRows ? "+" : ""}`
                                : "-"
                        }
                    />

                    <Label theme={isExecuting ? "warning" : "normal"}>
                        {isExecuting ? t('workspace.executing') : t('workspace.idle')}
                    </Label>
                </div>
            </div>
        </Card>
    );
}
