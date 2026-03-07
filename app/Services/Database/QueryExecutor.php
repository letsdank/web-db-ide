<?php

namespace App\Services\Database;

use App\Models\DbConnection;
use PDO;

class QueryExecutor
{
    public function execute(DbConnection $connection, string $sql, int $maxRows = 500): array
    {
        $pdo = $this->createPdo($connection);

        $start = microtime(true);

        $statement = $pdo->prepare($sql);
        $statement->execute();

        $columns = [];
        $rows = [];

        if ($statement->columnCount() > 0) {
            for ($i = 0; $i < $statement->columnCount(); $i++) {
                $meta = $statement->getColumnMeta($i);

                $columns[] = [
                    'name' => $meta['name'],
                    'native_type' => $meta['native_type'] ?? null,
                ];
            }

            $rows = $statement->fetchAll(PDO::FETCH_NUM);

            if (count($rows) > $maxRows) {
                $rows = array_slice($rows, 0, $maxRows);
            }
        }

        $duration = (int)((microtime(true) - $start) * 1000);

        return [
            'columns' => $columns,
            'rows' => $rows,
            'row_count' => count($rows),
            'duration_ms' => $duration,
        ];
    }

    protected function createPdo(DbConnection $connection): PDO
    {
        $dsn = sprintf(
            "pgsql:host=%s;port=%s;dbname=%s",
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
                PDO::ATTR_TIMEOUT => $connection->connect_timeout_seconds ?? 10,
            ]
        );
    }
}
