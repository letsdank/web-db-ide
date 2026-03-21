import {describe, expect, it} from "vitest";
import {CONNECTIONS_I18N_KEYS} from "./i18nKeys";

describe('connections i18n keys', () => {
    it('keeps connections namespace centralized', () => {
        expect(CONNECTIONS_I18N_KEYS.newConnection).toBe('connections.newConnection');
        expect(CONNECTIONS_I18N_KEYS.sections.database).toBe('connections.database');
        expect(CONNECTIONS_I18N_KEYS.placeholders.connectionName).toBe('connections.placeholders.connectionName');
        expect(CONNECTIONS_I18N_KEYS.status.connectedTo).toBe('connections.connectedTo');
    });
});
