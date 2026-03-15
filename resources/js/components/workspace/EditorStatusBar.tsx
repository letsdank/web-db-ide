import {Card, Label, Text} from "@gravity-ui/uikit";

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
        <div
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
            }}
        >
            <Text variant="body-2" color="secondary">
                {label}
            </Text>

            <Text
                variant="body-2"
                style={{
                    fontFamily: "var(--g-font-family-monospace, monospace)",
                }}
            >
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

    return (
        <Card
            view="filled"
            style={{
                padding: "8px 12px",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                }}
            >
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                    }}
                >
                    <Label theme={connectionName ? "info" : "utility"}>
                        {connectionName || "No connection"}
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
                                : "None"
                        }
                    />
                </div>

                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                    }}
                >
                    <StatusMeta
                        label="Rows"
                        value={
                            rowsCount !== null
                                ? `${rowsCount}${hasMoreRows ? "+" : ""}`
                                : "-"
                        }
                    />

                    <Label theme={isExecuting ? "warning" : "normal"}>
                        {isExecuting ? "Executing..." : "Idle"}
                    </Label>
                </div>
            </div>
        </Card>
    );
}
