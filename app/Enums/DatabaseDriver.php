<?php

namespace App\Enums;

enum DatabaseDriver: string
{
    case Postgres = 'pgsql';
    case MySql = 'mysql';
    case Sqlite = 'sqlite';

    public static function values(): array
    {
        return array_map(
            static fn(self $driver) => $driver->value,
            self::cases(),
        );
    }

    public function defaultPort(): int
    {
        return match ($this) {
            self::Postgres => 5432,
            self::MySql => 3306,
            self::Sqlite => 0,
        };
    }

    public function supportsSchemaDefault(): bool
    {
        return match ($this) {
            self::Postgres => true,
            self::MySql => false,
            self::Sqlite => false,
        };
    }

    public function supportsDumpExport(): bool
    {
        return match ($this) {
            self::Postgres => true,
            self::MySql => false,
            self::Sqlite => false,
        };
    }
}
