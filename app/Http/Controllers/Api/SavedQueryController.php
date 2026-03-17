<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SavedQuery\StoreSavedQueryRequest;
use App\Http\Requests\SavedQuery\UpdateSavedQueryRequest;
use App\Models\SavedQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavedQueryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $query = SavedQuery::query()
            ->with([
                'connection:id,name,driver,host,port,database_name',
                'shares:user_id,saved_query_id',
            ])
            ->where(function (Builder $query) use ($userId) {
                $query
                    ->where('user_id', $userId)
                    ->orWhereHas('shares', function (Builder $shareQuery) use ($userId) {
                        $shareQuery->where('user_id', $userId);
                    });
            });

        if ($request->filled('folder')) {
            $query->where('folder', $request->string('folder')->toString());
        }

        if ($request->filled('db_connection_id')) {
            $query->where('db_connection_id', (int)$request->input('db_connection_id'));
        }

        if ($request->filled('search')) {
            $search = mb_strtolower(trim($request->string('search')->toString()));
            $searchLike = '%' . $search . '%';

            $query->where(function (Builder $subQuery) use ($searchLike) {
                $subQuery
                    ->whereRaw('LOWER(title) LIKE ?', [$searchLike])
                    ->orWhereRaw('LOWER(COALESCE(description, "")) LIKE ?', [$searchLike])
                    ->orWhereRaw('LOWER(sql_text) LIKE ?', [$searchLike])
                    ->orWhereRaw('LOWER(COALESCE(folder, "")) LIKE ?', [$searchLike]);
            });
        }

        $savedQueries = $query
            ->orderByRaw('CASE WHEN user_id = ? THEN 0 ELSE 1 END', [$userId])
            ->orderByRaw('CASE WHEN folder IS NULL THEN 0 ELSE 1 END')
            ->orderBy('folder')
            ->orderBy('title')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'data' => $savedQueries->map(fn(SavedQuery $savedQuery) => $this->mapSavedQuery($savedQuery, $userId)),
        ]);
    }

    public function store(StoreSavedQueryRequest $request): JsonResponse
    {
        $savedQuery = SavedQuery::query()->create([
            'user_id' => $request->user()->id,
            'db_connection_id' => $request->validated('db_connection_id'),
            'title' => $request->validated('title'),
            'description' => $request->validated('description'),
            'sql_text' => $request->validated('sql_text'),
            'folder' => $request->validated('folder'),
            'visibility' => $request->validated('visibility') ?? 'private',
        ]);

        $savedQuery->load('connection:id,name,driver,host,port,database_name');

        return response()->json([
            'message' => 'Saved query created successfully.',
            'data' => $this->mapSavedQuery($savedQuery, $request->user()->id),
        ], 201);
    }

    public function show(Request $request, SavedQuery $savedQuery): JsonResponse
    {
        $this->authorizeSavedQueryRead($request, $savedQuery);

        $savedQuery->load([
            'connection:id,name,driver,host,port,database_name',
            'shares:user_id,saved_query_id',
        ]);

        return response()->json([
            'data' => $this->mapSavedQuery($savedQuery, $request->user()->id),
        ]);
    }

    public function update(UpdateSavedQueryRequest $request, SavedQuery $savedQuery): JsonResponse
    {
        $this->authorizeSavedQueryOwner($request, $savedQuery);

        $savedQuery->fill($request->validated());
        $savedQuery->save();

        $savedQuery->load('connection:id,name,driver,host,port,database_name');

        return response()->json([
            'message' => 'Saved query updated successfully.',
            'data' => $this->mapSavedQuery($savedQuery, $request->user()->id),
        ]);
    }

    public function destroy(Request $request, SavedQuery $savedQuery): JsonResponse
    {
        $this->authorizeSavedQueryOwner($request, $savedQuery);

        $savedQuery->delete();

        return response()->json([
            'message' => 'Saved query deleted successfully.',
        ]);
    }

    protected function authorizeSavedQueryRead(Request $request, SavedQuery $savedQuery): void
    {
        $userId = $request->user()->id;

        abort_unless(
            $savedQuery->isOwnedBy($userId) || $savedQuery->isSharedWithUser($userId),
            404
        );
    }

    protected function authorizeSavedQueryOwner(Request $request, SavedQuery $savedQuery): void
    {
        abort_unless($savedQuery->user_id === $request->user()->id, 404);
    }

    protected function mapSavedQuery(SavedQuery $savedQuery, int $userId): array
    {
        return [
            'id' => $savedQuery->id,
            'user_id' => $savedQuery->user_id,
            'db_connection_id' => $savedQuery->db_connection_id,
            'title' => $savedQuery->title,
            'description' => $savedQuery->description,
            'sql_text' => $savedQuery->sql_text,
            'folder' => $savedQuery->folder,
            'visibility' => $savedQuery->visibility,
            'created_at' => optional($savedQuery->created_at)?->toISOString(),
            'updated_at' => optional($savedQuery->updated_at)?->toISOString(),
            'is_owner' => $savedQuery->isOwnedBy($userId),
            'access_scope' => $savedQuery->getAccessScopeFor($userId),
            'connection' => $savedQuery->relationLoaded('connection') && $savedQuery->connection
                ? [
                    'id' => $savedQuery->connection->id,
                    'name' => $savedQuery->connection->name,
                    'driver' => $savedQuery->connection->driver,
                    'host' => $savedQuery->connection->host,
                    'port' => $savedQuery->connection->port,
                    'database_name' => $savedQuery->connection->database_name,
                ]
                : null,
        ];
    }
}
