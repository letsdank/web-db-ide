<?php

namespace App\Services\Database;

use App\Enums\DatabaseDriver;
use App\Models\DbConnection;
use LogicException;
use PDO;

/**
 * Executes ad-hoc SQL against a saved connection and converts the PDO result
 * into the response shape expected by the IDE result grid.
 */
class QueryExecutor
{
    public function __construct(
        protected ConnectionEndpointResolver $endpointResolver,
    )
    {
    }

    /**
     * Executes raw SQL against the given connection and returns structured
     * column metadata plus fetched rows.
     *
     * The fetch loop intentionally reads at most $maxRows + 1 records so the
     * caller can tell whether the result was truncated without materializing
     * the full dataset in memory.
     *
     * @return array{
     *     columns: list<array{name: string, native_type: string|null}>,
     *     rows: list<list<mixed>>,
     *     row_count: int,
     *     has_more: bool,
     *     duration_ms: int
     * }
     */
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

    /**
     * Creates a configured PDO instance for the target driver.
     */
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
            DatabaseDriver::Sqlite => throw new LogicException('SQLite DSL is handled separately.'),
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

    /**
     * Applies per-session settings that affect query execution semantics.
     *
     * Right now only PostgreSQL exposes the knobs we care about in the IDE:
     * default schema, statement timeout and read-only mode.
     */
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

    /**
     * Quotes a potentially dotted identifier for PostgreSQL search_path usage.
     *
     * Empty values fall back to "public" so bad input does not generate invalid
     * SQL during session initialization.
     */
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
