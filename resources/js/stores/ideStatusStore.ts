import {create} from "zustand";

export type SchemaLoadPhase = 'idle' | 'loading-schemas' | 'loading-tables' | 'loading-columns' | 'ready';

interface IdeStatusState {
    schemaLoadPhase: SchemaLoadPhase;
    setSchemaLoadPhase: (phase: SchemaLoadPhase) => void;
}

export const useIdeStatusStore = create<IdeStatusState>((set) => ({
    schemaLoadPhase: 'idle',
    setSchemaLoadPhase: (phase) => set({schemaLoadPhase: phase}),
}));
