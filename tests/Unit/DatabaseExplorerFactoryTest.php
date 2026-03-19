<?php

namespace Tests\Unit;

use App\Models\DbConnection;
use App\Services\Database\DatabaseExplorerFactory;
use App\Services\Database\MySqlExplorer;
use App\Services\Database\PostgresExplorer;
use Tests\TestCase;

class DatabaseExplorerFactoryTest extends TestCase
{
    public function test_it_resolves_postgres_explorer(): void
    {
        $factory = $this->app->make(DatabaseExplorerFactory::class);

        $connection = new DbConnection([
            'driver' => 'pgsql',
        ]);

        $explorer = $factory->for($connection);

        $this->assertInstanceOf(PostgresExplorer::class, $explorer);
    }

    public function test_it_resolves_mysql_explorer(): void
    {
        $factory = $this->app->make(DatabaseExplorerFactory::class);

        $connection = new DbConnection([
            'driver' => 'mysql',
        ]);

        $explorer = $factory->for($connection);

        $this->assertInstanceOf(MySqlExplorer::class, $explorer);
    }

    public function test_it_throws_for_unsupported_driver(): void
    {
        $factory = $this->app->make(DatabaseExplorerFactory::class);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Unsupported explorer driver [sqlite].');

        $factory->for(new DbConnection([
            'driver' => 'sqlite',
        ]));
    }
}
