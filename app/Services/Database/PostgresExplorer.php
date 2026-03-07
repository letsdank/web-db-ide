<?php

namespace App\Services\Database;

use App\Models\DbConnection;
use PDO;

class PostgresExplorer
{
    protected function pdo(DbConnection $connection): PDO
    {
        $dsn = sprintf(
            "pgql:host=%s;port=%s;dbname=%s",
            $connection->host,
            $connection->port,
            $connection->database_name
        );

        return new PDO(
            $dsn,
            $connection->username,
            decrypt($connection->password_encrypted),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            ]
        );
    }

    public function schemas(DbConnection $connection): array
    {
        $pdo = $this->pdo($connection);

        $stmt = $pdo->query("
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name NOT IN ('pg_catalog','information_schema')
            ORDER BY schema_name
        ");

        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    public function tables(DbConnection $connection, string $schema): array
    {
        $pdo = $this->pdo($connection);

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
    }

    public function columns(DbConnection$connection,string$schema,string$table):array
    {
        $pdo=$this->pdo($connection);

        $stmt=$pdo->prepare("
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
            'schema'=>$schema,
            'table'=>$table,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function indexes(DbConnection$connection,string$schema,string$table):array
    {
        $pdo=$this->pdo($connection);

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
    }
}
