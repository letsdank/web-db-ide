import type {DatabaseDriver} from "../../../types/connection";
import {EXPLORER_I18N_KEYS} from "./i18nKeys";

export function getExplorerGroupLabelKey(driver: DatabaseDriver): string {
    return driver === 'mysql'
        ? EXPLORER_I18N_KEYS.databaseLabel
        : EXPLORER_I18N_KEYS.schemaLabel;
}

export function getExplorerGroupCollectionLabelKey(driver: DatabaseDriver): string {
    return driver === 'mysql'
        ? EXPLORER_I18N_KEYS.databasesLabel
        : EXPLORER_I18N_KEYS.schemasLabel;
}

export function getExplorerLoadingGroupLabelKey(driver: DatabaseDriver): string {
    return driver === 'mysql'
        ? EXPLORER_I18N_KEYS.loadingDatabases
        : EXPLORER_I18N_KEYS.loadingSchemas;
}

export function getExplorerEmptyGroupLabelKey(driver: DatabaseDriver): string {
    return driver === 'mysql'
        ? EXPLORER_I18N_KEYS.noDatabasesAvailable
        : EXPLORER_I18N_KEYS.noSchemasAvailable;
}

export function getExplorerEmptyFilteredGroupLabelKey(driver: DatabaseDriver): string {
    return driver === 'mysql'
        ? EXPLORER_I18N_KEYS.noDatabasesOrTablesMatchFilter
        : EXPLORER_I18N_KEYS.noSchemasOrTablesMatchFilter;
}
