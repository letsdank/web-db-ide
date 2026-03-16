<?php

namespace Tests\Feature\Api;

use App\Models\DbConnection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DbConnectionControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_only_authenticated_users_connections(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $ownConnection = DbConnection::query()->create([
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

        DbConnection::query()->create([
            'user_id' => $otherUser->id,
            'name' => 'Other DB',
            'driver' => 'pgsql',
            'host' => '10.0.0.2',
            'port' => 5432,
            'database_name' => 'other_db',
            'username' => 'other',
            'password_encrypted' => encrypt('secret'),
            'visibility' => 'shared',
        ]);

        $response = $this
            ->actingAs($user, 'sanctum')
            ->getJson('/api/connections');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ownConnection->id)
            ->assertJsonPath('data.0.name', 'Main DB');
    }

    public function test_store_persists_connection_for_authenticated_user_and_encrypts_password(): void
    {
        $user = User::factory()->create();

        $payload = [
            'name' => 'Analytics DB',
            'driver' => 'pgsql',
            'host' => '127.0.0.1',
            'port' => 5432,
            'database_name' => 'analytics',
            'username' => 'postgres',
            'password' => 'super-secret',
            'schema_default' => 'public',
            'ssl_mode' => 'prefer',
            'color' => 'purple',
            'is_read_only' => true,
            'use_ssh_tunnel' => false,
        ];

        $response = $this
            ->actingAs($user, 'sanctum')
            ->postJson('/api/connections', $payload);

        $response
            ->assertCreated()
            ->assertJsonPath('data.name', 'Analytics DB')
            ->assertJsonPath('data.username', 'postgres')
            ->assertJsonPath('data.visibility', 'private');

        $connection = DbConnection::query()->firstOrFail();

        $this->assertSame($user->id, $connection->user_id);
        $this->assertSame('Analytics DB', $connection->name);
        $this->assertSame('super-secret', decrypt($connection->password_encrypted));
        $this->assertSame('private', $connection->visibility);
        $this->assertTrue($connection->is_read_only);
    }

    public function test_store_sets_private_visibility_by_default(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user, 'sanctum')
            ->postJson('/api/connections', [
                'name' => 'Default Visibility DB',
                'driver' => 'pgsql',
                'host' => '127.0.0.1',
                'port' => 5432,
                'database_name' => 'default_visibility',
                'username' => 'postgres',
                'password' => 'secret',
                'use_ssh_tunnel' => false,
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.visibility', 'private');

        $connection = DbConnection::query()->firstOrFail();

        $this->assertSame('private', $connection->visibility);
    }

    public function test_store_accepts_shared_visibility(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user, 'sanctum')
            ->postJson('/api/connections', [
                'name' => 'Shared DB',
                'driver' => 'pgsql',
                'host' => '127.0.0.1',
                'port' => 5432,
                'database_name' => 'shared_db',
                'username' => 'postgres',
                'password' => 'secret',
                'visibility' => 'shared',
                'use_ssh_tunnel' => false,
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.visibility', 'shared');

        $connection = DbConnection::query()->firstOrFail();

        $this->assertSame('shared', $connection->visibility);
    }

    public function test_owner_can_update_connection_visibility(): void
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

        $response = $this
            ->actingAs($user, 'sanctum')
            ->patchJson("/api/connections/$connection->id", [
                'visibility' => 'shared',
                'color' => 'blue',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.visibility', 'shared')
            ->assertJsonPath('data.color', 'blue');

        $connection->refresh();

        $this->assertSame('shared', $connection->visibility);
        $this->assertSame('blue', $connection->color);
    }

    public function test_user_cannot_update_another_users_connection(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $foreignConnection = DbConnection::query()->create([
            'user_id' => $otherUser->id,
            'name' => 'Secret DB',
            'driver' => 'pgsql',
            'host' => '127.0.0.1',
            'port' => 5432,
            'database_name' => 'secret_db',
            'username' => 'postgres',
            'password_encrypted' => encrypt('secret'),
            'visibility' => 'private',
        ]);

        $this
            ->actingAs($user, 'sanctum')
            ->patchJson("/api/connections/$foreignConnection->id", [
                'visibility' => 'shared',
                'name' => 'Hacked DB',
            ])
            ->assertNotFound();

        $foreignConnection->refresh();

        $this->assertSame('Secret DB', $foreignConnection->name);
        $this->assertSame('private', $foreignConnection->visibility);
    }

    public function test_owner_can_delete_connection(): void
    {
        $user = User::factory()->create();

        $connection = DbConnection::query()->create([
            'user_id' => $user->id,
            'name' => 'Disposable DB',
            'driver' => 'pgsql',
            'host' => '127.0.0.1',
            'port' => 5432,
            'database_name' => 'disposable_db',
            'username' => 'postgres',
            'password_encrypted' => encrypt('secret'),
            'visibility' => 'private',
        ]);

        $this
            ->actingAs($user, 'sanctum')
            ->deleteJson("/api/connections/$connection->id")
            ->assertOk();

        $this->assertDatabaseMissing('db_connections', [
            'id' => $connection->id,
        ]);
    }

    public function test_user_cannot_delete_another_users_connection(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $foreignConnection = DbConnection::query()->create([
            'user_id' => $otherUser->id,
            'name' => 'Foreign DB',
            'driver' => 'pgsql',
            'host' => '127.0.0.1',
            'port' => 5432,
            'database_name' => 'foreign_db',
            'username' => 'postgres',
            'password_encrypted' => encrypt('secret'),
            'visibility' => 'private',
        ]);

        $this
            ->actingAs($user, 'sanctum')
            ->deleteJson("/api/connections/$foreignConnection->id")
            ->assertNotFound();

        $this->assertDatabaseHas('db_connections', [
            'id' => $foreignConnection->id,
        ]);
    }

    public function test_user_cannot_view_another_users_connection(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $foreignConnection = DbConnection::query()->create([
            'user_id' => $otherUser->id,
            'name' => 'Secret DB',
            'driver' => 'pgsql',
            'host' => '127.0.0.1',
            'port' => 5432,
            'database_name' => 'secret_db',
            'username' => 'postgres',
            'password_encrypted' => encrypt('secret'),
            'visibility' => 'private',
        ]);

        $this
            ->actingAs($user, 'sanctum')
            ->getJson("/api/connections/$foreignConnection->id")
            ->assertNotFound();
    }
}
