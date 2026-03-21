import {describe, expect, it} from "vitest";
import {WORKSPACE_I18N_KEYS} from "./i18nKeys";

describe('workspace i18n keys', () => {
    it('keeps workspace namespace centralized', () => {
        expect(WORKSPACE_I18N_KEYS.runAll).toBe('workspace.runAll');
        expect(WORKSPACE_I18N_KEYS.dump.export).toBe('workspace.exportDump');
        expect(WORKSPACE_I18N_KEYS.dump.sectionData).toBe('workspace.dumpSectionData');
        expect(WORKSPACE_I18N_KEYS.resources.shared).toBe('workspace.sharedResources');
    });
});
