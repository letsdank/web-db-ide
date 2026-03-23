import type {PropsWithChildren} from "react";
import {useAuthStore} from "../../stores/authStores";
import {logout} from "../../api/auth";
import {Button, Select, Text} from "@gravity-ui/uikit";
import {useI18n} from "../../i18n";
import {useSettingsStore} from "../../stores/settingsStore";
import {IdeStatusBar} from "./IdeStatusBar";

export function AppShell({children}: PropsWithChildren) {
    const user = useAuthStore((state) => state.user);
    const reset = useAuthStore((state) => state.reset);
    const {locale, t} = useI18n();
    const setLocale = useSettingsStore((state) => state.setLocale);

    async function handleLogout() {
        try {
            await logout();
        } finally {
            reset();
        }
    }

    return (
        <div className="app-shell">
            <header className="app-shell__header">
                <strong>{t('app.title')}</strong>

                <div className="app-shell__user">
                    <Text variant="body-2" color="secondary">
                        {user?.email ?? t('common.guest')}
                    </Text>

                    <Select
                        size="m"
                        width="max"
                        value={[locale]}
                        onUpdate={(value) => {
                            const next = value[0];
                            if (next === 'ru' || next === 'en') {
                                setLocale(next);
                            }
                        }}
                        options={[
                            {value: 'en', content: t('app.english')},
                            {value: 'ru', content: t('app.russian')},
                        ]}
                    />

                    <Button size="m" view="flat-secondary" onClick={handleLogout}>
                        {t('app.logout')}
                    </Button>
                </div>
            </header>

            <main>{children}</main>
            <IdeStatusBar />
        </div>
    );
}
