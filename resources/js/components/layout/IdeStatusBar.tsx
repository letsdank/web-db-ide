import {useI18n} from "../../i18n";
import {useWorkspaceStore} from "../../stores/workspaceStore";
import {useIdeStatusStore} from "../../stores/ideStatusStore";
import {Label, Text} from "@gravity-ui/uikit";

export function IdeStatusBar() {
    const {t} = useI18n();

    const activeConnectionId = useWorkspaceStore((s) => s.activeConnectionId);
    const connections = useWorkspaceStore((s) => s.connections);
    const tabStateById = useWorkspaceStore((s) => s.tabStateById);
    const activeTabId = useWorkspaceStore((s) => s.activeTabId);
    const schemaLoadPhase = useIdeStatusStore((s) => s.schemaLoadPhase);

    const activeConnection = connections.find((c) => c.id === activeConnectionId) ?? null;
    const isExecuting = activeTabId ? (tabStateById[activeTabId]?.isExecuting ?? false) : false;

    const phaseLabel: Record<typeof schemaLoadPhase, string | null> = {
        idle: null,
        'loading-schemas': t('status.loadingSchemas'),
        'loading-tables': t('status.loadingTables'),
        'loading-columns': t('status.loadingColumns'),
        ready: null,
    };

    const loadingMessage = phaseLabel[schemaLoadPhase];

    return (
        <div className="ide-status-bar">
            <div className="ide-status-bar__left">
                <Text variant="caption-2" color="secondary">
                    Web SQL IDE
                </Text>
            </div>

            <div className="ide-status-bar__center">
                {isExecuting ? (
                    <Label theme="warning" size="xs">
                        {t('status.executingQuery')}
                    </Label>
                ) : null}

                {loadingMessage ? (
                    <Label theme="info" size="xs">
                        {loadingMessage}
                    </Label>
                ) : null}
            </div>

            <div className="ide-status-bar__right">
                {activeConnection ? (
                    <>
                        {activeConnection.use_ssh_tunnel ? (
                            <Label theme="success" size="xs">SSH</Label>
                        ) : null}

                        {activeConnection.is_read_only ? (
                            <Label theme="warning" size="xs">
                                {t('connections.readOnly')}
                            </Label>
                        ) : null}

                        <Text variant="caption-2" color="secondary">
                            {activeConnection.name}
                        </Text>

                        <Text variant="caption-2" color="hint">
                            {activeConnection.driver} · {activeConnection.database_name}
                        </Text>
                    </>
                ) : (
                    <Text variant="caption-2" color="hint">
                        {t('status.noConnection')}
                    </Text>
                )}
            </div>
        </div>
    );
}
