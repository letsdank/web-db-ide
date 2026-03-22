import type {DatabaseDriver} from "../types/connection";

export interface DatabaseDriverDefinition {
    id: DatabaseDriver;
    label: string;
    defaultPort: number;
    defaultSchema: string | null;
    supportsSchemaDefault: boolean;
    supportsDumpExport: boolean;
}

export const DATABASE_DRIVERS: Record<DatabaseDriver, DatabaseDriverDefinition> = {
    pgsql: {
        id: 'pgsql',
        label: 'PostgreSQL',
        defaultPort: 5432,
        defaultSchema: 'public',
        supportsSchemaDefault: true,
        supportsDumpExport: true,
    },
    mysql: {
        id: 'mysql',
        label: 'MySQL / MariaDB',
        defaultPort: 3306,
        defaultSchema: null,
        supportsSchemaDefault: false,
        supportsDumpExport: false,
    },
    sqlite: {
        id: 'sqlite',
        label: 'SQLite',
        defaultPort: 0,
        defaultSchema: null,
        supportsSchemaDefault: false,
        supportsDumpExport: false,
    },
};

export function getDatabaseDriverDefinition(driver: DatabaseDriver | string | null | undefined): DatabaseDriverDefinition {
    if (driver && driver in DATABASE_DRIVERS) {
        return DATABASE_DRIVERS[driver as DatabaseDriver];
    }

    return DATABASE_DRIVERS.pgsql;
}

export function getDatabaseDriverOptions() {
    return Object.values(DATABASE_DRIVERS).map((driver) => ({
        value: driver.id,
        content: driver.label,
    }));
}

export function supportsDumpExport(driver: DatabaseDriver | string | null | undefined): boolean {
    return getDatabaseDriverDefinition(driver).supportsSchemaDefault;
}
