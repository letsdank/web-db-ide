import {describe, expect, it} from "vitest";
import {translate} from "./index";

describe('translate', () => {
    it('returns localized value for existing key', () => {
        expect(translate('ru', 'workspace.runAll')).toBe('Выполнить всё');
        expect(translate('en', 'workspace.runAll')).toBe('Run all');
    });

    it('falls back to english when locale key is missing in selected dictionary', () => {
        expect(translate('ru', 'common.cancel')).toBe('Отмена');
    });

    it('interpolates params', () => {
        expect(
            translate('ru', 'connections.connectedTo', {
                database: 'app_db',
                user: 'dank',
                duration: 12,
            }),
        ).toContain('app_db');
        expect(
            translate('en', 'connections.connectedTo', {
                database: 'app_db',
                user: 'dank',
                duration: 12,
            }),
        ).toContain('12');
    });

    it('returns key when translation is missing everywhere', () => {
        expect(translate('ru', 'totally.missing.key')).toBe('totally.missing.key');
    });
});
