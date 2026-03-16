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
        $query = SavedQuery::query()
            ->where('user_id', $request->user()->id)
            ->with('connection:id,name,driver,host,port,database_name');

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
            ->orderByRaw('CASE WHEN folder IS NULL THEN 0 ELSE 1 END')
            ->orderBy('folder')
            ->orderBy('title')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'data' => $savedQueries->map(fn(SavedQuery $savedQuery) => $this->mapSavedQuery($savedQuery)),
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
            'data' => $this->mapSavedQuery($savedQuery),
        ], 201);
    }

    public function show(Request $request, SavedQuery $savedQuery): JsonResponse
    {
        $this->authorizeSavedQuery($request, $savedQuery);

        $savedQuery->load('connection:id,name,driver,host,port,database_name');

        return response()->json([
            'data' => $this->mapSavedQuery($savedQuery),
        ]);
    }

    public function update(UpdateSavedQueryRequest $request, SavedQuery $savedQuery): JsonResponse
    {
        $this->authorizeSavedQuery($request, $savedQuery);

        $savedQuery->fill($request->validated());
        $savedQuery->save();

        $savedQuery->load('connection:id,name,driver,host,port,database_name');

        return response()->json([
            'message' => 'Saved query updated successfully.',
            'data' => $this->mapSavedQuery($savedQuery),
        ]);
    }

    public function destroy(Request $request, SavedQuery $savedQuery): JsonResponse
    {
        $this->authorizeSavedQuery($request, $savedQuery);

        $savedQuery->delete();

        return response()->json([
            'message' => 'Saved query deleted successfully.',
        ]);
    }

    protected function authorizeSavedQuery(Request $request, SavedQuery $savedQuery): void
    {
        abort_unless($savedQuery->user_id === $request->user()->id, 404);
    }

    protected function mapSavedQuery(SavedQuery $savedQuery): array
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
