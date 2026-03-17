import en from "./en";
import ru from "./ru";
import {useSettingsStore} from "../stores/settingsStore";

export const dictionaries = {
    en,
    ru,
};

export type Locale = keyof typeof dictionaries;

function getByPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, part) => {
        if (acc && typeof acc === 'object' && part in acc) {
            return (acc as Record<string, unknown>)[part];
        }

        return undefined;
    }, obj);
}

function interpolate(template: string, params?: Record<string, string | number | null | undefined>): string {
    if (!params) {
        return template;
    }

    return template.replace(/\{(\w+)\}/g, (_, key: string) => {
        const value = params[key];
        return value === null || value === undefined ? '' : String(value);
    });
}

export function translate(
    locale: Locale,
    key: string,
    params?: Record<string, string | number | null | undefined>,
): string {
    const dictionary = dictionaries[locale] ?? dictionaries.en;
    const fallback = dictionaries.en;

    const value = getByPath(dictionary, key) ?? getByPath(fallback, key);

    if (typeof value !== 'string') {
        return key;
    }

    return interpolate(value, params);
}

export function useI18n() {
    const locale = useSettingsStore((state) => state.locale);

    return {
        locale,
        t: (key: string, params?: Record<string, string | number | null | undefined>) =>
            translate(locale, key, params),
    };
}
