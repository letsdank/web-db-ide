<?php

namespace App\Services\Database;

use App\Models\DbConnection;
use App\Services\Database\Contracts\DatabaseExplorer;
use PDO;

abstract class AbstractNetworkExplorer implements DatabaseExplorer
{
    public function __construct(
        protected ConnectionEndpointResolver $endpointResolver,
    )
    {
    }

    abstract protected function buildDsn(DbConnection $connection, string $host, int $port): string;

    protected function pdo(DbConnection $connection): array
    {
        $resolved = $this->endpointResolver->resolve($connection);

        $pdo = new PDO(
            $this->buildDsn($connection, $resolved->host, $resolved->port),
            $connection->username,
            decrypt($connection->password_encrypted),
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
        );

        return [$pdo, $resolved];
    }
}
