<?php

namespace Tests\Feature\Api;

use App\Models\DbConnection;
use App\Models\DbConnectionShare;
use App\Models\User;
use App\Services\Database\Contracts\DatabaseExplorer;
use App\Services\Database\DatabaseExplorerFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class ExplorerConnectionApi extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_fetch_schemas(): void
    {
        $user = User::factory()->create();

        $connection = DbConnection::query()->create([
            'user_id' => $user->id,
            'name' => 'Main DB',
            'driver' => 'pgsql',
            'host' => '127.0.0.1',
            'port' => 5432,
            'database_name' => 'main_db',
            'username' => 'postgres',
            'password_encrypted' => encrypt('secret'),
            'visibility' => 'private',
        ]);

        $explorer = Mockery::mock(DatabaseExplorer::class);
        $explorer->shouldReceive('schemas')
            ->once()
            ->with(Mockery::on(fn(DbConnection $value) => $value->id === $connection->id))
            ->andReturn(['public', 'analytics']);

        $factory = Mockery::mock(DatabaseExplorerFactory::class);
        $factory->shouldReceive('for')
            ->once()
            ->with(Mockery::on(fn(DbConnection $value) => $value->id === $connection->id))
            ->andReturn($explorer);

        $this->app->instance(DatabaseExplorerFactory::class, $factory);

        $this
            ->actingAs($user, 'sanctum')
            ->getJson("/api/connections/$connection->id/schemas")
            ->assertOk()
            ->assertJson([
                'data' => ['public', 'analytics'],
            ]);
    }

    public function test_shared_user_can_fetch_tables(): void
    {
        $owner = User::factory()->create();
        $sharedUser = User::factory()->create();

        $connection = DbConnection::query()->create([
            'user_id' => $owner->id,
            'name' => 'Shared DB',
            'driver' => 'pgsql',
            'host' => '127.0.0.1',
            'port' => 5432,
            'database_name' => 'shared_db',
            'username' => 'postgres',
            'password_encrypted' => encrypt('secret'),
            'visibility' => 'shared',
        ]);

        DbConnectionShare::query()->create([
            'db_connection_id' => $connection->id,
            'user_id' => $sharedUser->id,
        ]);

        $explorer = Mockery::mock(DatabaseExplorer::class);
        $explorer->shouldReceive('tables')
            ->once()
            ->with(
                Mockery::on(fn(DbConnection $value) => $value->id === $connection->id),
                'public',
            )
            ->andReturn([
                ['table_name' => 'users', 'table_type' => 'BASE TABLE'],
            ]);

        $factory = Mockery::mock(DatabaseExplorerFactory::class);
        $factory->shouldReceive('for')
            ->once()
            ->with(Mockery::on(fn(DbConnection $value) => $value->id === $connection->id))
            ->andReturn($explorer);

        $this->app->instance(DatabaseExplorerFactory::class, $factory);

        $this
            ->actingAs($sharedUser, 'sanctum')
            ->getJson("/api/connections/$connection->id/schemas/public/tables")
            ->assertOk()
            ->assertJson([
                'data' => [
                    ['table_name' => 'users', 'table_type' => 'BASE TABLE'],
                ],
            ]);
    }

    public function test_table_endpoint_returns_columns_and_indexes(): void
    {
        $user = User::factory()->create();

        $connection = DbConnection::query()->create([
            'user_id' => $user->id,
            'name' => 'Main DB',
            'driver' => 'mysql',
            'host' => '127.0.0.1',
            'port' => 3306,
            'database_name' => 'app_db',
            'username' => 'root',
            'password_encrypted' => encrypt('secret'),
            'visibility' => 'private',
        ]);

        $explorer = Mockery::mock(DatabaseExplorer::class);
        $explorer->shouldReceive('columns')
            ->once()
            ->andReturn([
                [
                    'column_name' => 'id',
                    'data_type' => 'bigint',
                    'is_nullable' => 'NO',
                    'column_default' => null,
                ],
            ]);

        $explorer->shouldReceive('indexes')
            ->once()
            ->andReturn([
                [
                    'indexname' => 'PRIMARY',
                    'indexdef' => 'UNIQUE INDEX (id)',
                ],
            ]);

        $factory = Mockery::mock(DatabaseExplorerFactory::class);
        $factory->shouldReceive('for')
            ->once()
            ->andReturn($explorer);

        $this->app->instance(DatabaseExplorerFactory::class, $factory);

        $this
            ->actingAs($user, 'sanctum')
            ->getJson("/api/connections/$connection->id/tables/app_db/users")
            ->assertOk()
            ->assertJson([
                'schema' => 'app_db',
                'table' => 'users',
                'columns' => [
                    [
                        'column_name' => 'id',
                        'data_type' => 'bigint',
                        'is_nullable' => 'NO',
                        'column_default' => null,
                    ],
                ],
                'indexes' => [
                    [
                        'indexname' => 'PRIMARY',
                        'indexdef' => 'UNIQUE INDEX (id)',
                    ],
                ],
            ]);
    }

    public function test_owner_can_fetch_foreign_keys(): void
    {
        $user = User::factory()->create();

        $connection = DbConnection::query()->create([
            'user_id' => $user->id,
            'name' => 'Main DB',
            'driver' => 'pgsql',
            'host' => '127.0.0.1',
            'port' => 5432,
            'database_name' => 'main_db',
            'username' => 'postgres',
            'password_encrypted' => encrypt('secret'),
            'visibility' => 'private',
        ]);

        $explorer = Mockery::mock(DatabaseExplorer::class);
        $explorer->shouldReceive('foreignKeys')
            ->once()
            ->with(
                Mockery::on(fn(DbConnection $value) => $value->id === $connection->id),
                'public',
            )
            ->andReturn([
                [
                    'from_table' => 'orders',
                    'from_column' => 'users_id',
                    'to_table' => 'users',
                    'to_column' => 'id',
                    'constraint_name' => 'orders_user_id_fkey',
                ],
            ]);

        $factory = Mockery::mock(DatabaseExplorerFactory::class);
        $factory->shouldReceive('for')
            ->once()
            ->with(Mockery::on(fn(DbConnection $value) => $value->id === $connection->id))
            ->andReturn($explorer);

        $this->app->instance(DatabaseExplorerFactory::class, $factory);

        $this
            ->actingAs($user, 'sanctum')
            ->getJson("/api/connections/$connection->id/schemas/public/foreign-keys")
            ->assertOk()
            ->assertJson([
                'data' => [
                    [
                        'from_table' => 'orders',
                        'from_column' => 'user_id',
                        'to_table' => 'users',
                        'to_column' => 'id',
                        'constraint_name' => 'orders_user_id_fkey',
                    ],
                ],
            ]);
    }

    public function test_stranger_cannot_fetch_foreign_keys(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();

        $connection = DbConnection::query()->create([
            'user_id' => $owner->id,
            'name' => 'Private DB',
            'driver' => 'pgsql',
            'host' => '127.0.0.1',
            'port' => 5432,
            'database_name' => 'private_db',
            'username' => 'postgres',
            'password_encrypted' => encrypt('secret'),
            'visibility' => 'private',
        ]);

        $this
            ->actingAs($stranger, 'sanctum')
            ->getJson("/api/connections/$connection->id/schemas/public/foreign-keys")
            ->assertNotFound();
    }

    public function test_shared_user_can_fetch_foreign_keys(): void
    {
        $owner = User::factory()->create();
        $sharedUser = User::factory()->create();

        $connection = DbConnection::query()->create([
            'user_id' => $owner->id,
            'name' => 'Shared DB',
            'driver' => 'pgsql',
            'host' => '127.0.0.1',
            'port' => 5432,
            'database_name' => 'shared_db',
            'username' => 'postgres',
            'password_encrypted' => encrypt('secret'),
            'visibility' => 'shared',
        ]);

        DbConnectionShare::query()->create([
            'db_connection_id' => $connection->id,
            'user_id' => $sharedUser->id,
        ]);

        $explorer = Mockery::mock(DatabaseExplorer::class);
        $explorer->shouldReceive('foreignKeys')
            ->once()
            ->andReturn([]);

        $factory = Mockery::mock(DatabaseExplorerFactory::class);
        $factory->shouldReceive('for')->once()->andReturn($explorer);

        $this->app->instance(DatabaseExplorerFactory::class, $factory);

        $this
            ->actingAs($sharedUser, 'sanctum')
            ->getJson("/api/connections/$connection->id/schemas/public/foreign-keys")
            ->assertOk()
            ->assertJson(['data' => []]);
    }
}
