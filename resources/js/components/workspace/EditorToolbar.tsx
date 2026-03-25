import type {ConnectionDto} from "../../types/connection";
import {Button, Card, Hotkey, Select, Text} from "@gravity-ui/uikit";
import {useI18n} from "../../i18n";
import {DriverIcon} from "../common/DriverIcon";

interface Props {
    connections: ConnectionDto[];
    activeConnectionId: number | null;
    isExecuting: boolean;
    hasSelection: boolean;
    onSelectConnection: (id: number | null) => void;
    onRun: () => void;
    onRunSelection: () => void;
}

/**
 * Main editor action bar above the SQL editor.
 *
 * Responsibilities:
 * - run current SQL or current selection
 * - rebind the active tab to a connection
 * - expose the most important editor hotkeys in the UI
 */
export function EditorToolbar({
                                  connections,
                                  activeConnectionId,
                                  isExecuting,
                                  hasSelection,
                                  onSelectConnection,
                                  onRun,
                                  onRunSelection,
                              }: Props) {
    const selectValue = activeConnectionId ? [String(activeConnectionId)] : [];
    const {t} = useI18n();

    return (
        <Card view="filled" className="editor-toolbar__card">
            <div className="editor-toolbar__content">
                <Button
                    view="action"
                    size="l"
                    onClick={onRun}
                    disabled={!activeConnectionId || isExecuting}
                    loading={isExecuting}
                >
                    {t('workspace.runAll')}
                </Button>

                <Button
                    view="outlined"
                    size="l"
                    onClick={onRunSelection}
                    disabled={!activeConnectionId || isExecuting || !hasSelection}
                >
                    {t('workspace.runSelection')}
                </Button>

                <div className="editor-toolbar__connection">
                    <Select
                        width="max"
                        size="l"
                        filterable
                        hasClear
                        placeholder={t('workspace.selectConnection')}
                        value={selectValue}
                        onUpdate={(value) => {
                            const first = value[0];
                            onSelectConnection(first ? Number(first) : null);
                        }}
                        options={connections.map((connection) => ({
                            value: String(connection.id),
                            content: (
                                <span className="editor-toolbar__connection-option">
                                    <span className="editor-toolbar__connection-option-icon">
                                        <DriverIcon driver={connection.driver} size={16}/>
                                    </span>
                                    <span className="editor-toolbar__connection-option-text">
                                        {connection.name} · ({connection.driver})
                                    </span>
                                </span>
                            ),
                        }))}
                    />
                </div>

                <div className="editor-toolbar__hotkeys">

                    {hasSelection ? (
                        <>
                            <Text variant="body-2" color="secondary">
                                {t('workspace.runSelection')}
                            </Text>
                            <Hotkey value="shift+mod+enter" view="dark"/>
                        </>
                    ) : (
                        <>
                            <Text variant="body-2" color="secondary">
                                {t('workspace.runAll')}
                            </Text>
                            <Hotkey value="mod+enter" view="dark"/>
                        </>
                    )}
                </div>
            </div>
        </Card>
    );
}
