import type {Locale} from "../i18n";
import {create} from "zustand";
import {persist} from "zustand/middleware";

interface SettingsState {
    locale: Locale;
    setLocale: (locale: Locale) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            locale: 'en',
            setLocale: (locale) => set({locale}),
        }),
        {
            name: 'web-db-ide-settings',
        },
    ),
);
