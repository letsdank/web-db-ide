<?php

namespace App\Services\Database\Explorers;

use App\Models\DbConnection;
use PDO;

class PostgresExplorer extends AbstractNetworkExplorer
{
    protected function buildDsn(DbConnection $connection, string $host, int $port): string
    {
        return sprintf('pgsql:host=%s;port=%s;dbname=%s', $host, $port, $connection->database_name);
    }

    public function schemas(DbConnection $connection): array
    {
        [$pdo, $resolved] = $this->pdo($connection);

        try {
            $stmt = $pdo->query("
                SELECT schema_name
                FROM information_schema.schemata
                WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
                ORDER BY schema_name
            ");

            return $stmt->fetchAll(PDO::FETCH_COLUMN);
        } finally {
            $this->endpointResolver->cleanup($resolved);
        }
    }

    public function tables(DbConnection $connection, string $schema): array
    {
        [$pdo, $resolved] = $this->pdo($connection);

        try {
            $stmt = $pdo->prepare("
                SELECT
                    table_name,
                    table_type
                FROM information_schema.tables
                WHERE table_schema = :schema
                ORDER BY table_name
            ");

            $stmt->execute([
                'schema' => $schema,
            ]);

            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } finally {
            $this->endpointResolver->cleanup($resolved);
        }
    }

    public function columns(DbConnection $connection, string $schema, string $table): array
    {
        [$pdo, $resolved] = $this->pdo($connection);

        try {
            $stmt = $pdo->prepare("
                SELECT
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_schema = :schema
                  AND table_name = :table
                ORDER BY ordinal_position
            ");

            $stmt->execute([
                'schema' => $schema,
                'table' => $table,
            ]);

            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } finally {
            $this->endpointResolver->cleanup($resolved);
        }
    }

    public function indexes(DbConnection $connection, string $schema, string $table): array
    {
        [$pdo, $resolved] = $this->pdo($connection);

        try {
            $stmt = $pdo->prepare("
                SELECT
                    indexname,
                    indexdef
                FROM pg_indexes
                WHERE schemaname = :schema
                  AND tablename = :table
                ORDER BY indexname
            ");

            $stmt->execute([
                'schema' => $schema,
                'table' => $table,
            ]);

            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } finally {
            $this->endpointResolver->cleanup($resolved);
        }
    }

    public function foreignKeys(DbConnection $connection, string $schema): array
    {
        [$pdo, $resolved] = $this->pdo($connection);

        try {
            $stmt = $pdo->prepare("
                SELECT
                    tc.table_name AS from_table,
                    kcu.column_name AS from_column,
                    ccu.table_name AS to_table,
                    ccu.column_name AS to_column,
                    tc.constraint_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                  AND tc.table_schema = :schema
                ORDER BY tc.table_name, kcu.column_name
            ");

            $stmt->execute(['schema' => $schema]);

            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } finally {
            $this->endpointResolver->cleanup($resolved);
        }
    }
}
