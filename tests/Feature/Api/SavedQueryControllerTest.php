<?php

namespace Tests\Feature\Api;

use App\Models\DbConnection;
use App\Models\SavedQuery;
use App\Models\SavedQueryShare;
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
            'visibility' => 'private',
        ]);

        SavedQuery::query()->create([
            'user_id' => $otherUser->id,
            'db_connection_id' => null,
            'title' => 'Payments',
            'description' => 'Foreign query',
            'sql_text' => 'select * from payments;',
            'folder' => 'Finance',
            'visibility' => 'shared',
        ]);

        $response = $this
            ->actingAs($user, 'sanctum')
            ->getJson('/api/saved-queries');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ownQuery->id)
            ->assertJsonPath('data.0.title', 'Users list')
            ->assertJsonPath('data.0.visibility', 'private')
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
            'visibility' => 'private',
        ]);

        SavedQuery::query()->create([
            'user_id' => $user->id,
            'db_connection_id' => null,
            'title' => 'Orders report',
            'description' => 'Monthly orders',
            'sql_text' => 'select * from orders;',
            'folder' => 'Reports',
            'visibility' => 'private',
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
            ->assertJsonPath('data.title', 'Active users')
            ->assertJsonPath('data.visibility', 'private');

        $savedQuery = SavedQuery::query()->firstOrFail();

        $this->assertSame($user->id, $savedQuery->user_id);
        $this->assertSame('Active users', $savedQuery->title);
        $this->assertSame('General', $savedQuery->folder);
        $this->assertSame('private', $savedQuery->visibility);
    }

    public function test_store_creates_shared_saved_query_when_visibility_is_passed(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user, 'sanctum')
            ->postJson('/api/saved-queries', [
                'title' => 'Shared report',
                'description' => 'Team query',
                'sql_text' => 'select * from reports;',
                'folder' => 'Reports',
                'visibility' => 'shared',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.title', 'Shared report')
            ->assertJsonPath('data.visibility', 'shared');

        $savedQuery = SavedQuery::query()->firstOrFail();

        $this->assertSame('shared', $savedQuery->visibility);
    }

    public function test_update_changes_saved_query_visibility_for_owner(): void
    {
        $user = User::factory()->create();

        $savedQuery = SavedQuery::query()->create([
            'user_id' => $user->id,
            'db_connection_id' => null,
            'title' => 'Users list',
            'description' => null,
            'sql_text' => 'select * from users;',
            'folder' => 'General',
            'visibility' => 'private',
        ]);

        $response = $this
            ->actingAs($user, 'sanctum')
            ->patchJson("/api/saved-queries/$savedQuery->id", [
                'visibility' => 'shared',
                'folder' => 'Team',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.visibility', 'shared')
            ->assertJsonPath('data.folder', 'Team');

        $this->assertSame('shared', $savedQuery->fresh()->visibility);
        $this->assertSame('Team', $savedQuery->fresh()->folder);
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
            'visibility' => 'private',
        ]);

        $this
            ->actingAs($user, 'sanctum')
            ->getJson("/api/saved-queries/$savedQuery->id")
            ->assertNotFound();
    }

    public function test_user_cannot_update_another_users_saved_query(): void
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
            'visibility' => 'private',
        ]);

        $this
            ->actingAs($user, 'sanctum')
            ->patchJson("/api/saved-queries/$savedQuery->id", [
                'visibility' => 'shared',
                'title' => 'Hacked',
            ])
            ->assertNotFound();

        $savedQuery->refresh();

        $this->assertSame('Foreign query', $savedQuery->title);
        $this->assertSame('private', $savedQuery->visibility);
    }

    public function test_index_includes_saved_queries_shared_with_authenticated_user(): void
    {
        $owner = User::factory()->create();
        $sharedWith = User::factory()->create();

        $ownQuery = SavedQuery::query()->create([
            'user_id' => $sharedWith->id,
            'db_connection_id' => null,
            'title' => 'Own query',
            'description' => null,
            'sql_text' => 'select current_date;',
            'folder' => 'Personal',
            'visibility' => 'private',
        ]);

        $sharedQuery = SavedQuery::query()->create([
            'user_id' => $owner->id,
            'db_connection_id' => null,
            'title' => 'Team query',
            'description' => 'Shared with team',
            'sql_text' => 'select * from reports;',
            'folder' => 'Reports',
            'visibility' => 'shared',
        ]);

        SavedQueryShare::query()->create([
            'saved_query_id' => $sharedQuery->id,
            'user_id' => $sharedWith->id,
            'granted_by_user_id' => $owner->id,
        ]);

        $response = $this
            ->actingAs($sharedWith, 'sanctum')
            ->getJson('/api/saved-queries');

        $response
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $ownQuery->id)
            ->assertJsonPath('data.0.access_scope', 'owned')
            ->assertJsonPath('data.0.is_owner', true)
            ->assertJsonPath('data.1.id', $sharedQuery->id)
            ->assertJsonPath('data.1.access_scope', 'shared_with_me')
            ->assertJsonPath('data.1.is_owner', false);
    }

    public function test_user_can_open_saved_query_shared_with_them(): void
    {
        $owner = User::factory()->create();
        $sharedWith = User::factory()->create();

        $savedQuery = SavedQuery::query()->create([
            'user_id' => $owner->id,
            'db_connection_id' => null,
            'title' => 'Shared lookup',
            'description' => null,
            'sql_text' => 'select * from users;',
            'folder' => 'Team',
            'visibility' => 'shared',
        ]);

        SavedQueryShare::query()->create([
            'saved_query_id' => $savedQuery->id,
            'user_id' => $sharedWith->id,
            'granted_by_user_id' => $owner->id,
        ]);

        $this
            ->actingAs($sharedWith, 'sanctum')
            ->getJson("/api/saved-queries/$savedQuery->id")
            ->assertOk()
            ->assertJsonPath('data.id', $savedQuery->id)
            ->assertJsonPath('data.access_scope', 'shared_with_me')
            ->assertJsonPath('data.is_owner', false);
    }

    public function test_user_cannot_update_saved_query_shared_with_them(): void
    {
        $owner = User::factory()->create();
        $sharedWith = User::factory()->create();

        $savedQuery = SavedQuery::query()->create([
            'user_id' => $owner->id,
            'db_connection_id' => null,
            'title' => 'Team dashboard',
            'description' => null,
            'sql_text' => 'select * from dashboards;',
            'folder' => 'Team',
            'visibility' => 'shared',
        ]);

        SavedQueryShare::query()->create([
            'saved_query_id' => $savedQuery->id,
            'user_id' => $sharedWith->id,
            'granted_by_user_id' => $owner->id,
        ]);

        $this
            ->actingAs($sharedWith, 'sanctum')
            ->patchJson("/api/saved-queries/$savedQuery->id", [
                'title' => 'Hacked title',
            ])
            ->assertNotFound();

        $this->assertSame('Team dashboard', $savedQuery->fresh()->title);
    }
}
