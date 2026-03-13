<?php

namespace App\Services\Database;

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

        try {
            $pdo = $this->createPdo($connection, $resolved->host, $resolved->port);

            if ($connection->schema_default) {
                $schemaStatement = $pdo->prepare(
                    'SET search_path TO ' . $this->quoteIdentifier($connection->schema_default)
                );
                $schemaStatement->execute();
            }

            if ($connection->query_timeout_seconds) {
                $timeoutStatement = $pdo->prepare('SET statement_timeout TO :timeout_ms');
                $timeoutStatement->execute([
                    'timeout_ms' => max(1000, ((int)$connection->query_timeout_seconds) * 1000),
                ]);
            }

            if ($connection->is_read_only) {
                $readOnlyStatement = $pdo->prepare('SET default_transaction_read_only = on');
                $readOnlyStatement->execute();
            }

            $start = microtime(true);

            $statement = $pdo->prepare($sql);
            $statement->execute();

            $columns = [];
            $rows = [];

            if ($statement->columnCount() > 0) {
                for ($i = 0; $i < $statement->columnCount(); $i++) {
                    $meta = $statement->getColumnMeta($i);

                    $columns[] = [
                        'name' => $meta['name'] ?? 'column_' . ($i + 1),
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
        } finally {
            $this->endpointResolver->cleanup($resolved);
        }
    }

    protected function createPdo(DbConnection $connection, string $host, int $port): PDO
    {
        $dsn = sprintf(
            "pgsql:host=%s;port=%s;dbname=%s",
            $host,
            $port,
            $connection->database_name,
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

    protected function quoteIdentifier(string $identifier): string
    {
        $parts = array_filter(array_map('trim', explode('.', $identifier)));

        if ($parts === []) {
            return 'public';
        }

        return implode('.', array_map(
            static fn(string $part) => '"' . str_replace('"', '""', $part) . '"',
            $parts,
        ));
    }
}
