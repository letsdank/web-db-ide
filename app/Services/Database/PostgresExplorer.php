<?php

namespace App\Services\Database;

use App\Models\DbConnection;
use PDO;

class PostgresExplorer
{
    public function __construct(
        protected ConnectionEndpointResolver $endpointResolver,
    )
    {
    }

    protected function pdo(DbConnection $connection): array
    {
        $resolved = $this->endpointResolver->resolve($connection);

        $dsn = sprintf(
            "pgsql:host=%s;port=%s;dbname=%s",
            $connection->host,
            $connection->port,
            $connection->database_name
        );

        $pdo = new PDO(
            $dsn,
            $connection->username,
            decrypt($connection->password_encrypted),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            ]
        );

        return [$pdo, $resolved];
    }

    public function schemas(DbConnection $connection): array
    {
        [$pdo, $resolved] = $this->pdo($connection);

        try {
            $stmt = $pdo->query("
                SELECT schema_name
                FROM information_schema.schemata
                WHERE schema_name NOT IN ('pg_catalog','information_schema')
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
}
