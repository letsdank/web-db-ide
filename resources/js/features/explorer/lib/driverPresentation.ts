import type {DatabaseDriver} from "../../../types/connection";

export function getExplorerGroupLabelKey(driver: DatabaseDriver): string {
    return driver === 'mysql'
        ? 'explorer.databaseLabel'
        : 'explorer.schemaLabel';
}

export function getExplorerGroupCollectionLabelKey(driver: DatabaseDriver): string {
    return driver === 'mysql'
        ? 'explorer.databasesLabel'
        : 'explorer.schemasLabel';
}

export function getExplorerLoadingGroupLabelKey(driver: DatabaseDriver): string {
    return driver === 'mysql'
        ? 'explorer.loadingDatabases'
        : 'explorer.loadingSchemas';
}

export function getExplorerEmptyGroupLabelKey(driver: DatabaseDriver): string {
    return driver === 'mysql'
        ? 'explorer.noDatabasesAvailable'
        : 'explorer.noSchemasAvailable';
}

export function getExplorerEmptyFilteredGroupLabelKey(driver: DatabaseDriver): string {
    return driver === 'mysql'
        ? 'explorer.noDatabasesOrTablesMatchFilter'
        : 'explorer.noSchemasOrTablesMatchFilter';
}
