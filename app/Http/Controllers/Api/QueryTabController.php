<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\QueryTab\ReorderQueryTabsRequest;
use App\Http\Requests\QueryTab\StoreQueryTabRequest;
use App\Http\Requests\QueryTab\UpdateQueryTabRequest;
use App\Models\QueryTab;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QueryTabController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tabs = QueryTab::query()
            ->where('user_id', $request->user()->id)
            ->with('connection:id,name,driver,host,port,database_name')
            ->orderByDesc('is_pinned')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $tabs->map(fn(QueryTab $tab) => $this->mapQueryTab($tab)),
        ]);
    }

    public function store(StoreQueryTabRequest $request): JsonResponse
    {
        $maxSortOrder = QueryTab::query()
            ->where('user_id', $request->user()->id)
            ->max('sort_order');

        $tab = QueryTab::query()->create([
            'user_id' => $request->user()->id,
            'db_connection_id' => $request->validated('db_connection_id'),
            'title' => $request->validated('title') ?? 'New Query',
            'sql_text' => $request->validated('sql_text') ?? '',
            'selected_text' => $request->validated('selected_text'),
            'cursor_position' => $request->validated('cursor_position'),
            'selection_range' => $request->validated('selection_range'),
            'is_pinned' => $request->validated('is_pinned', false),
            'sort_order' => is_numeric($maxSortOrder) ? ((int)$maxSortOrder + 1) : 0,
        ]);

        $tab->load('connection:id,name,driver,host,port,database_name');

        return response()->json([
            'message' => 'Query tab created successfully.',
            'data' => $this->mapQueryTab($tab),
        ], 201);
    }

    public function show(Request $request, QueryTab $queryTab): JsonResponse
    {
        $this->authorizeQueryTab($request, $queryTab);

        $queryTab->load('connection:id,name,driver,host,port,database_name');

        return response()->json([
            'data' => $this->mapQueryTab($queryTab),
        ]);
    }

    public function update(UpdateQueryTabRequest $request, QueryTab $queryTab): JsonResponse
    {
        $this->authorizeQueryTab($request, $queryTab);

        $queryTab->fill($request->validated());
        $queryTab->save();

        $queryTab->load('connection:id,name,driver,host,port,database_name');

        return response()->json([
            'message' => 'Query tab updated successfully.',
            'data' => $this->mapQueryTab($queryTab),
        ]);
    }

    public function destroy(Request $request, QueryTab $queryTab): JsonResponse
    {
        $this->authorizeQueryTab($request, $queryTab);

        $queryTab->delete();

        return response()->json([
            'message' => 'Query tab deleted successfully.',
        ]);
    }

    public function reorder(ReorderQueryTabsRequest $request): JsonResponse
    {
        $userId = $request->user()->id;
        $tabs = $request->validated('tabs');

        $ids = collect($tabs)
            ->pluck('id')
            ->map(fn($id) => (int)$id)
            ->values();

        $ownedIds = QueryTab::query()
            ->where('user_id', $userId)
            ->whereIn('id', $ids)
            ->pluck('id')
            ->map(fn($id) => (int)$id)
            ->values();

        if ($ownedIds->count() !== $ids->count()) {
            abort(422, 'One or more tabs do not belong to the current user.');
        }

        DB::transaction(function () use ($tabs, $userId) {
            foreach ($tabs as $tabData) {
                QueryTab::query()
                    ->where('user_id', $userId)
                    ->where('id', $tabData['id'])
                    ->update([
                        'sort_order' => $tabData['sort_order'],
                    ]);
            }
        });

        $updatedTabs = QueryTab::query()
            ->where('user_id', $userId)
            ->with('connection:id,name,driver,host,port,database_name')
            ->orderByDesc('is_pinned')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json([
            'message' => 'Query tabs reordered successfully.',
            'data' => $updatedTabs->map(fn(QueryTab $tab) => $this->mapQueryTab($tab)),
        ]);
    }

    protected function authorizeQueryTab(Request $request, QueryTab $queryTab): void
    {
        abort_unless($queryTab->user_id === $request->user()->id, 404);
    }

    protected function mapQueryTab(QueryTab $tab): array
    {
        return [
            'id' => $tab->id,
            'user_id' => $tab->user_id,
            'db_connection_id' => $tab->db_connection_id,
            'title' => $tab->title,
            'sql_text' => $tab->sql_text,
            'selected_text' => $tab->selected_text,
            'cursor_position' => $tab->cursor_position,
            'selection_range' => $tab->selection_range,
            'is_pinned' => (bool) $tab->is_pinned,
            'sort_order' => (int) $tab->sort_order,
            'last_executed_at' => optional($tab->last_executed_at)?->toISOString(),
            'created_at' => optional($tab->created_at)?->toISOString(),
            'updated_at' => optional($tab->updated_at)?->toISOString(),
            'connection' => $tab->relationLoaded('connection') && $tab->connection
                ? [
                    'id' => $tab->connection->id,
                    'name' => $tab->connection->name,
                    'driver' => $tab->connection->driver,
                    'host' => $tab->connection->host,
                    'port' => $tab->connection->port,
                    'database_name' => $tab->connection->database_name,
                ]
                : null,
        ];
    }
}
