import {describe, expect, it} from "vitest";
import {EXPLORER_I18N_KEYS} from "./i18nKeys";

describe('explorer i18n keys', () => {
    it('keeps explorer namespace centralized', () => {
        expect(EXPLORER_I18N_KEYS.title).toBe('explorer.title');
        expect(EXPLORER_I18N_KEYS.hiddenActiveConnectionHint).toBe('explorer.hiddenActiveConnectionHint');
        expect(EXPLORER_I18N_KEYS.schemaLabel).toBe('explorer.schemaLabel');
        expect(EXPLORER_I18N_KEYS.databaseLabel).toBe('explorer.databaseLabel');
    });
});
