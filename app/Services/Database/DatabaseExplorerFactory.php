<?php

namespace App\Services\Database;

use App\Models\DbConnection;
use App\Services\Database\Contracts\DatabaseExplorer;

class DatabaseExplorerFactory
{
    public function __construct(
        protected PostgresExplorer $postgresExplorer,
        protected MySqlExplorer    $mySqlExplorer,
    )
    {
    }

    public function for(DbConnection $connection): DatabaseExplorer
    {
        return match ($connection->driver) {
            'pgsql' => $this->postgresExplorer,
            'mysql' => $this->mySqlExplorer,
            default => throw new \InvalidArgumentException(
                sprintf('Unsupported explorer driver [%s].', $connection->driver)
            ),
        };
    }
}
