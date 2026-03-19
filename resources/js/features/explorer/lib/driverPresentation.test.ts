import {describe, expect, it} from "vitest";
import {
    getExplorerEmptyFilteredGroupLabelKey,
    getExplorerEmptyGroupLabelKey,
    getExplorerGroupCollectionLabelKey,
    getExplorerGroupLabelKey,
    getExplorerLoadingGroupLabelKey
} from "./driverPresentation";

describe('explorer driver presentation helpers', () => {
    it('returns postgres-oriented keys', () => {
        expect(getExplorerGroupLabelKey('pgsql')).toBe('explorer.schemaLabel');
        expect(getExplorerGroupCollectionLabelKey('pgsql')).toBe('explorer.schemasLabel');
        expect(getExplorerLoadingGroupLabelKey('pgsql')).toBe('explorer.loadingSchemas');
        expect(getExplorerEmptyGroupLabelKey('pgsql')).toBe('explorer.noSchemasAvailable');
        expect(getExplorerEmptyFilteredGroupLabelKey('pgsql')).toBe('explorer.noSchemasOrTablesMatchFilter');
    });

    it('returns mysql-oriented keys', () => {
        expect(getExplorerGroupLabelKey('mysql')).toBe('explorer.databaseLabel');
        expect(getExplorerGroupCollectionLabelKey('mysql')).toBe('explorer.databasesLabel');
        expect(getExplorerLoadingGroupLabelKey('mysql')).toBe('explorer.loadingDatabases');
        expect(getExplorerEmptyGroupLabelKey('mysql')).toBe('explorer.noDatabasesAvailable');
        expect(getExplorerEmptyFilteredGroupLabelKey('mysql')).toBe('explorer.noDatabasesOrTablesMatchFilter');
    });
});
