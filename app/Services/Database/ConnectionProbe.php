<?php

namespace App\Services\Database;

use App\Models\DbConnection;
use PDO;

class ConnectionProbe
{
    public function __construct(
        protected ConnectionEndpointResolver $endpointResolver,
    )
    {
    }

    public function probe(DbConnection $connection): array
    {
        $resolved = $this->endpointResolver->resolve($connection);

        try {
            $dsn = sprintf(
                'pgsql:host=%s;port=%s;dbname=%s',
                $resolved->host,
                $resolved->port,
                $connection->database_name,
            );

            $start = microtime(true);

            $pdo = new PDO(
                $dsn,
                $connection->username,
                decrypt($connection->password_decrypted),
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_TIMEOUT => $connection->connect_timeout_seconds ?? 10,
                ],
            );

            $statement = $pdo->query('select current_database() as database_name, current_user as user_name');
            $meta = $statement->fetch(PDO::FETCH_ASSOC) ?: [];

            return [
                'ok' => true,
                'duration_ms' => (int)((microtime(true) - $start) * 1000),
                'database_name' => $meta['database_name'] ?? $connection->database_name,
                'user_name' => $meta['user_name'] ?? $connection->username,
            ];
        } finally {
            $this->endpointResolver->cleanup($resolved);
        }
    }
}
