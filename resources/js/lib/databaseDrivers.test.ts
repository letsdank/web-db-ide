import {describe, expect, it} from "vitest";
import {getDatabaseDriverDefinition, getDatabaseDriverOptions, supportsDumpExport} from "./databaseDrivers";

describe('databaseDrivers', () => {
    it('returns postgres metadata by default', () => {
        expect(getDatabaseDriverDefinition(null)).toMatchObject({
            id: 'pgsql',
            defaultPort: 5432,
            defaultSchema: 'public',
        });
    });

    it('returns mysql metadata', () => {
        expect(getDatabaseDriverDefinition('mysql')).toMatchObject({
            id: 'mysql',
            defaultPort: 3306,
            defaultSchema: null,
            supportsSchemaDefault: false,
        });
    });

    it('reports dump support correctly', () => {
        expect(supportsDumpExport('pgsql')).toBe(true);
        expect(supportsDumpExport('mysql')).toBe(false);
    });

    it('returns driver options for connection form', () => {
        expect(getDatabaseDriverOptions()).toEqual([
            {value: 'pgsql', content: 'PostgreSQL'},
            {value: 'mysql', content: 'MySQL / MariaDB'},
            {value: 'sqlite', content: 'SQLite'},
        ]);
    });
});
