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
            ->assertJsonPath('data.username', 'postgres');

        $connection = DbConnection::query()->firstOrFail();

        $this->assertSame($user->id, $connection->user_id);
        $this->assertSame('Analytics DB', $connection->name);
        $this->assertSame('super-secret', decrypt($connection->password_encrypted));
        $this->assertTrue($connection->is_read_only);
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
        ]);

        $this
            ->actingAs($user, 'sanctum')
            ->getJson("/api/connections/$foreignConnection->id")
            ->assertNotFound();
    }
}
