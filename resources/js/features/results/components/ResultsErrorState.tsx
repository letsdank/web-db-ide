import {Card, Label, Text} from "@gravity-ui/uikit";
import {useI18n} from "../../../i18n";

interface Props {
    error: string;
    activeConnectionName?: string | null;
    activeDatabaseName?: string | null;
    activeTabTitle?: string | null;
}

export function ResultsErrorState({
                                      error,
                                      activeConnectionName,
                                      activeDatabaseName,
                                      activeTabTitle
                                  }: Props) {
    const{t}=useI18n();

    return (
        <Card
            view="filled"
            className="workspace-card workspace-card--hidden results-panel"
        >
            <div className="results-panel__header results-panel__header-wrap">
                <div className="results-panel__title-group">
                    <Text variant="subheader-2">{t('workspace.results')}</Text>
                    <Label theme="danger">{t('workspace.error')}</Label>
                </div>

                <div className="results-panel__meta">
                    {activeConnectionName ? <Label theme="utility">{activeConnectionName}</Label> : null}
                    {activeDatabaseName ? <Label theme="unknown">{activeDatabaseName}</Label> : null}
                    {activeTabTitle ? <Label theme="info">{activeTabTitle}</Label> : null}
                </div>
            </div>

            <div className="results-panel__error-box">
                <Text variant="body-2">{error}</Text>
            </div>
        </Card>
    );
}
