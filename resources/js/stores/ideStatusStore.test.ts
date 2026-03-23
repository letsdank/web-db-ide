import {beforeEach, describe, expect, it} from "vitest";
import {useIdeStatusStore} from "./ideStatusStore";

describe('ideStatusStore', () => {
    beforeEach(() => {
        useIdeStatusStore.setState({schemaLoadPhase: 'idle'});
    });

    it('starts in idle phase', () => {
        expect(useIdeStatusStore.getState().schemaLoadPhase).toBe('idle');
    });

    it('transitions to loading-schemas', () => {
        useIdeStatusStore.getState().setSchemaLoadPhase('loading-schemas');
        expect(useIdeStatusStore.getState().schemaLoadPhase).toBe('loading-schemas');
    });

    it('transitions to loading-tables', () => {
        useIdeStatusStore.getState().setSchemaLoadPhase('loading-tables');
        expect(useIdeStatusStore.getState().schemaLoadPhase).toBe('loading-tables');
    });

    it('transitions to ready', () => {
        useIdeStatusStore.getState().setSchemaLoadPhase('ready');
        expect(useIdeStatusStore.getState().schemaLoadPhase).toBe('ready');
    });

    it('can reset back to idle', () => {
        useIdeStatusStore.getState().setSchemaLoadPhase('ready');
        useIdeStatusStore.getState().setSchemaLoadPhase('idle');
        expect(useIdeStatusStore.getState().schemaLoadPhase).toBe('idle');
    });
});
