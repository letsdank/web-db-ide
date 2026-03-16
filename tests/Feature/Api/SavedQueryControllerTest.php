<?php

namespace Tests\Feature\Api;

use App\Models\DbConnection;
use App\Models\SavedQuery;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SavedQueryControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_only_authenticated_users_saved_queries(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $connection = DbConnection::query()->create([
            'user_id' => $user->id,
            'name' => 'App DB',
            'driver' => 'pgsql',
            'host' => '127.0.0.1',
            'port' => 5432,
            'database_name' => 'app_db',
            'username' => 'postgres',
            'password_encrypted' => encrypt('secret'),
        ]);

        $ownQuery = SavedQuery::query()->create([
            'user_id' => $user->id,
            'db_connection_id' => $connection->id,
            'title' => 'Users list',
            'description' => 'Shows users',
            'sql_text' => 'select * from users;',
            'folder' => 'General',
        ]);

        SavedQuery::query()->create([
            'user_id' => $otherUser->id,
            'db_connection_id' => null,
            'title' => 'Payments',
            'description' => 'Foreign query',
            'sql_text' => 'select * from payments;',
            'folder' => 'Finance',
        ]);

        $response = $this
            ->actingAs($user, 'sanctum')
            ->getJson('/api/saved-queries');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ownQuery->id)
            ->assertJsonPath('data.0.title', 'Users list')
            ->assertJsonPath('data.0.connection.name', 'App DB');
    }

    public function test_index_filters_saved_queries_by_search_and_folder(): void
    {
        $user = User::factory()->create();

        SavedQuery::query()->create([
            'user_id' => $user->id,
            'db_connection_id' => null,
            'title' => 'Users by email',
            'description' => 'Lookup users',
            'sql_text' => 'select * from users where email is not null;',
            'folder' => 'CRM',
        ]);

        SavedQuery::query()->create([
            'user_id' => $user->id,
            'db_connection_id' => null,
            'title' => 'Orders report',
            'description' => 'Monthly orders',
            'sql_text' => 'select * from orders;',
            'folder' => 'Reports',
        ]);

        $response = $this
            ->actingAs($user, 'sanctum')
            ->getJson('/api/saved-queries?search=email&folder=CRM');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Users by email');
    }

    public function test_store_creates_saved_query_for_authenticated_user(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user, 'sanctum')
            ->postJson('/api/saved-queries', [
                'title' => 'Active users',
                'description' => 'Only active users',
                'sql_text' => 'select * from users where active = true;',
                'folder' => 'General',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.title', 'Active users');

        $savedQuery = SavedQuery::query()->firstOrFail();

        $this->assertSame($user->id, $savedQuery->user_id);
        $this->assertSame('Active users', $savedQuery->title);
        $this->assertSame('General', $savedQuery->folder);
    }

    public function test_user_cannot_open_another_users_saved_query(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $savedQuery = SavedQuery::query()->create([
            'user_id' => $otherUser->id,
            'db_connection_id' => null,
            'title' => 'Foreign query',
            'description' => null,
            'sql_text' => 'select 1;',
            'folder' => null,
        ]);

        $this
            ->actingAs($user, 'sanctum')
            ->getJson("/api/saved-queries/$savedQuery->id")
            ->assertNotFound();
    }
}
