<?php

namespace Tests\Feature\Api;

use App\Models\QueryTab;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueryTabControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_only_authenticated_users_tabs_in_sort_order(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $middleTab = QueryTab::query()->create([
            'user_id' => $user->id,
            'title' => 'Middle tab',
            'sql_text' => 'select 2;',
            'sort_order' => 20,
            'is_pinned' => false,
        ]);

        QueryTab::query()->create([
            'user_id' => $user->id,
            'title' => 'First tab',
            'sql_text' => 'select 1;',
            'sort_order' => 10,
            'is_pinned' => false,
        ]);

        QueryTab::query()->create([
            'user_id' => $otherUser->id,
            'title' => 'Foreign tab',
            'sql_text' => 'select 999;',
            'sort_order' => 1,
            'is_pinned' => false,
        ]);

        $response = $this
            ->actingAs($user, 'sanctum')
            ->getJson('/api/query-tabs');

        $response
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.title', 'First tab')
            ->assertJsonPath('data.1.id', $middleTab->id);
    }

    public function test_reorder_updates_sort_order_for_authenticated_users_tabs(): void
    {
        $user = User::factory()->create();

        $firstTab = QueryTab::query()->create([
            'user_id' => $user->id,
            'title' => 'Tab A',
            'sql_text' => 'select 1;',
            'sort_order' => 10,
            'is_pinned' => false,
        ]);

        $secondTab = QueryTab::query()->create([
            'user_id' => $user->id,
            'title' => 'Tab B',
            'sql_text' => 'select 2;',
            'sort_order' => 20,
            'is_pinned' => false,
        ]);

        $thirdTab = QueryTab::query()->create([
            'user_id' => $user->id,
            'title' => 'Tab C',
            'sql_text' => 'select 3;',
            'sort_order' => 30,
            'is_pinned' => false,
        ]);

        $response = $this
            ->actingAs($user, 'sanctum')
            ->patchJson('/api/query-tabs/reorder', [
                'tabs' => [
                    ['id' => $thirdTab->id, 'sort_order' => 10],
                    ['id' => $firstTab->id, 'sort_order' => 20],
                    ['id' => $secondTab->id, 'sort_order' => 30],
                ],
            ]);

        $response->assertOk();

        $this->assertSame(20, $firstTab->fresh()->sort_order);
        $this->assertSame(30, $secondTab->fresh()->sort_order);
        $this->assertSame(10, $thirdTab->fresh()->sort_order);
    }

    public function test_reorder_does_not_update_foreign_tabs(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $ownTab = QueryTab::query()->create([
            'user_id' => $user->id,
            'title' => 'Own tab',
            'sql_text' => 'select 1;',
            'sort_order' => 10,
            'is_pinned' => false,
        ]);

        $foreignTab = QueryTab::query()->create([
            'user_id' => $otherUser->id,
            'title' => 'Foreign tab',
            'sql_text' => 'select 2;',
            'sort_order' => 99,
            'is_pinned' => false,
        ]);

        $response = $this
            ->actingAs($user, 'sanctum')
            ->patchJson('/api/query-tabs/reorder', [
                'tabs' => [
                    ['id' => $ownTab->id, 'sort_order' => 50],
                    ['id' => $foreignTab->id, 'sort_order' => 1],
                ],
            ]);

        $response->assertStatus(422);

        $this->assertSame(10, $ownTab->fresh()->sort_order);
        $this->assertSame(99, $foreignTab->fresh()->sort_order);
    }

    public function test_user_cannot_update_foreign_tab(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $foreignTab = QueryTab::query()->create([
            'user_id' => $otherUser->id,
            'title' => 'Foreign tab',
            'sql_text' => 'select 2;',
            'sort_order' => 99,
            'is_pinned' => false,
        ]);

        $this
            ->actingAs($user, 'sanctum')
            ->patchJson("/api/query-tabs/$foreignTab->id", [
                'title' => 'Hacked title',
            ])
            ->assertNotFound();

        $this->assertSame('Foreign tab', $foreignTab->fresh()->title);
    }

    public function test_store_creates_erd_tab_with_type_and_meta(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user, 'sanctum')
            ->postJson('/api/query-tabs', [
                'title' => 'public ERD',
                'tab_type' => 'erd',
                'meta' => ['connectionId' => 1, 'schema' => 'public'],
                'sql_text' => '',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.tab_type', 'erd')
            ->assertJsonPath('data.meta.schema', 'public')
            ->assertJsonPath('data.meta.connectionId', 1);
    }

    public function test_store_defaults_tab_type_to_sql(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user, 'sanctum')
            ->postJson('/api/query-tabs', [
                'title' => 'New Query',
                'sql_text' => 'select 1',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.tab_type', 'sql');
    }

    public function test_store_rejects_invalid_tab_type(): void
    {
        $user = User::factory()->create();

        $this
            ->actingAs($user, 'sanctum')
            ->postJson('/api/query-tabs', [
                'title' => 'Bad Tab',
                'tab_type' => 'unknown',
            ])
            ->assertUnprocessable();
    }
}
