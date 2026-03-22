<?php

namespace App\Services\Database;

use App\Models\DbConnection;
use App\Services\Database\Contracts\DatabaseExplorer;
use App\Services\Database\Explorers\MySqlExplorer;
use App\Services\Database\Explorers\PostgresExplorer;
use App\Services\Database\Explorers\SqliteExplorer;
use InvalidArgumentException;

class DatabaseExplorerFactory
{
    public function __construct(
        protected PostgresExplorer $postgresExplorer,
        protected MySqlExplorer    $mySqlExplorer,
        protected SqliteExplorer   $sqliteExplorer,
    )
    {
    }

    /**
     * Resolves the appropriate DatabaseExplorer implementation for the given connection's driver.
     *
     * @throws InvalidArgumentException if the driver is not supported
     */
    public function for(DbConnection $connection): DatabaseExplorer
    {
        return match ($connection->driver) {
            'pgsql' => $this->postgresExplorer,
            'mysql' => $this->mySqlExplorer,
            'sqlite' => $this->sqliteExplorer,
            default => throw new InvalidArgumentException(
                sprintf('Unsupported explorer driver [%s].', $connection->driver)
            ),
        };
    }
}
