<?php

namespace App\Services\Database;

use App\Models\DbConnection;
use App\Services\Database\Contracts\DatabaseExplorer;
use PDO;

class MySqlExplorer implements DatabaseExplorer
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
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $resolved->host,
            $resolved->port,
            $connection->database_name,
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
            $stmt = $pdo->prepare("
                SELECT schema_name
                FROM information_schema.schemata
                WHERE schema_name = :database_name
                ORDER BY schema_name
            ");

            $stmt->execute([
                'database_name' => $connection->database_name,
            ]);

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
                    index_name AS indexname,
                    CONCAT(
                        CASE WHEN MIN(non_unique) = 0 THEN 'UNIQUE ' ELSE '' END,
                        'INDEX (',
                        GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ', '),
                        ')'
                    ) AS indexdef
                FROM information_schema.statistics
                WHERE table_schema = :schema
                  AND table_name = :table
                GROUP BY index_name
                ORDER BY index_name
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
