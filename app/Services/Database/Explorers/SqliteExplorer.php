<?php

namespace App\Services\Database\Explorers;

use App\Models\DbConnection;
use App\Services\Database\Contracts\DatabaseExplorer;
use PDO;

class SqliteExplorer implements DatabaseExplorer
{
    protected function pdo(DbConnection $connection): PDO
    {
        return new PDO(
            'sqlite:' . $connection->database_name,
            null,
            null,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
        );
    }

    // SQLite has no schemas - return a single virtual schema named "main"
    public function schemas(DbConnection $connection): array
    {
        return ['main'];
    }

    public function tables(DbConnection $connection, string $schema): array
    {
        $pdo = $this->pdo($connection);

        $stmt = $pdo->query("
            SELECT name AS table_name, type AS table_type
            FROM sqlite_master
            WHERE type IN ('table', 'view')
              AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        ");

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function columns(DbConnection $connection, string $schema, string $table): array
    {
        $pdo = $this->pdo($connection);

        $stmt = $pdo->prepare("PRAGMA table_info(:table)");
        $stmt->execute(['table' => $table]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(fn(array $row) => [
            'column_name' => $row['name'],
            'data_type' => $row['type'] ?: 'text',
            'is_nullable' => $row['notnull'] ? 'NO' : 'YES',
            'column_default' => $row['dflt_value'],
        ], $rows);
    }

    public function indexes(DbConnection $connection, string $schema, string $table): array
    {
        $pdo = $this->pdo($connection);

        $stmt = $pdo->prepare("PRAGMA index_list(:table)");
        $stmt->execute(['table' => $table]);
        $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $result = [];

        foreach ($indexes as $index) {
            $infoStmt = $pdo->prepare("PRAGMA index_info(:index)");
            $infoStmt->execute(['index' => $index['name']]);
            $cols = $infoStmt->fetchAll(PDO::FETCH_ASSOC);
            $colNames = implode('.', array_column($cols, 'name'));

            $result[] = [
                'indexname' => $index['name'],
                'indexdef' => sprintf(
                    '%sINDEX (%s)',
                    $index['unique'] ? 'UNIQUE ' : '',
                    $colNames,
                ),
            ];
        }

        return $result;
    }

    public function foreignKeys(DbConnection $connection, string $schema): array
    {
        $pdo = $this->pdo($connection);

        $tablesStmt = $pdo->query("
            SELECT name FROM sqlite_master
            WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
        ");
        $tables = $tablesStmt->fetchAll(PDO::FETCH_COLUMN);

        $result = [];

        foreach ($tables as $table) {
            $stmt = $pdo->prepare("PRAGMA foreign_key_list(:table)");
            $stmt->execute(['table' => $table]);
            $fks = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($fks as $fk) {
                $result[] = [
                    'from_table' => $table,
                    'from_column' => $fk['from'],
                    'to_table' => $fk['table'],
                    'to_column' => $fk['to'],
                    'constraint_name' => "{$table}_fk_{$fk['id']}",
                ];
            }
        }

        return $result;
    }
}
