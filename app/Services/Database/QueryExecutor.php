<?php

namespace App\Services\Database;

use App\Enums\DatabaseDriver;
use App\Models\DbConnection;
use PDO;

class QueryExecutor
{
    public function __construct(
        protected ConnectionEndpointResolver $endpointResolver,
    )
    {
    }

    public function execute(DbConnection $connection, string $sql, int $maxRows = 500): array
    {
        $resolved = $this->endpointResolver->resolve($connection);
        $driver = DatabaseDriver::from($connection->driver);

        try {
            $pdo = $this->createPdo($connection, $driver, $resolved->host, $resolved->port);

            $start = microtime(true);

            $this->applySessionSettings($pdo, $driver, $connection);

            $statement = $pdo->prepare($sql);
            $statement->execute();

            $columns = [];
            $rows = [];
            $hasMore = false;

            if ($statement->columnCount() > 0) {
                for ($i = 0; $i < $statement->columnCount(); $i++) {
                    $meta = $statement->getColumnMeta($i);

                    $columns[] = [
                        'name' => $meta['name'] ?? 'column_' . ($i + 1),
                        'native_type' => $meta['native_type'] ?? null,
                    ];
                }

                while (($row = $statement->fetch(PDO::FETCH_NUM)) !== false) {
                    $rows[] = $row;

                    if (count($rows) > $maxRows) {
                        $hasMore = true;
                        array_pop($rows);
                        break;
                    }
                }
            }

            $duration = (int)((microtime(true) - $start) * 1000);

            return [
                'columns' => $columns,
                'rows' => $rows,
                'row_count' => count($rows),
                'has_more' => $hasMore,
                'duration_ms' => $duration,
            ];
        } finally {
            $this->endpointResolver->cleanup($resolved);
        }
    }

    protected function createPdo(
        DbConnection   $connection,
        DatabaseDriver $driver,
        string         $host,
        int            $port
    ): PDO
    {
        if ($driver === DatabaseDriver::Sqlite) {
            return new PDO(
                'sqlite:' . $connection->database_name,
                null,
                null,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_TIMEOUT => $connection->connect_timeout_seconds ?? 10,
                ],
            );
        }

        $dsn = match ($driver) {
            DatabaseDriver::Postgres => sprintf(
                "pgsql:host=%s;port=%s;dbname=%s",
                $host,
                $port,
                $connection->database_name,
            ),
            DatabaseDriver::MySql => sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                $host,
                $port,
                $connection->database_name,
            ),
        };

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

    protected function applySessionSettings(PDO $pdo, DatabaseDriver $driver, DbConnection $connection): void
    {
        if ($driver !== DatabaseDriver::Postgres) {
            return;
        }

        if ($connection->schema_default) {
            $pdo->exec('SET search_path TO ' . $this->quoteIdentifier($connection->schema_default));
        }

        if ($connection->query_timeout_seconds) {
            $timeoutMs = max(1000, ((int)$connection->query_timeout_seconds) * 1000);
            $pdo->exec("SET statement_timeout TO $timeoutMs");
        }

        if ($connection->is_read_only) {
            $pdo->exec('SET default_transaction_read_only = on');
        }
    }

    protected function quoteIdentifier(string $identifier): string
    {
        $parts = array_filter(array_map('trim', explode('.', $identifier)));

        if ($parts === []) {
            return '"public"';
        }

        return implode('.', array_map(
            static fn(string $part) => '"' . str_replace('"', '""', $part) . '"',
            $parts,
        ));
    }
}
