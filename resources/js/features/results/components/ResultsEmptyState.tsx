import {Card, Label, Text} from "@gravity-ui/uikit";

interface Props {
    activeConnectionName?: string | null;
    activeDatabaseName?: string | null;
    activeTabTitle?: string | null;
}

export function ResultsEmptyState({
                                      activeConnectionName,
                                      activeDatabaseName,
                                      activeTabTitle,
                                  }: Props) {
    return (
        <Card
            view="filled"
            className="workspace-card workspace-card--hidden results-panel"
        >
            <div className="results-panel__header">
                <Text variant="subheader-2">Results</Text>

                <div className="results-panel__meta">
                    {activeConnectionName ? <Label theme="utility">{activeConnectionName}</Label> : null}
                    {activeDatabaseName ? <Label theme="unknown">{activeDatabaseName}</Label> : null}
                    {activeTabTitle ? <Label theme="info">{activeTabTitle}</Label> : null}
                </div>
            </div>

            <div className="results-panel__empty">
                <Text variant="body-2" color="secondary">
                    No results yet.
                </Text>
            </div>
        </Card>
    );
}
