<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Connection\StoreConnectionRequest;
use App\Http\Requests\Connection\UpdateConnectionRequest;
use App\Models\DbConnection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DbConnectionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $connections = DbConnection::query()
            ->where('user_id', $request->user()->id)
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $connections,
        ]);
    }

    public function store(StoreConnectionRequest $request): JsonResponse
    {
        $connection = DbConnection::query()->create([
            'user_id' => $request->user()->id,
            'name' => $request->name,
            'driver' => $request->driver,
            'host' => $request->host,
            'port' => $request->port,
            'database_name' => $request->database_name,
            'username' => $request->username,
            'password_encrypted' => encrypt($request->password),

            'ssl_mode' => $request->ssl_mode,
            'schema_default' => $request->schema_default,
            'color' => $request->color,
            'is_read_only' => $request->boolean('is_read_only'),
        ]);

        return response()->json([
            'data' => $connection
        ], 201);
    }

    public function show(Request $request, DbConnection $connection): JsonResponse
    {
        abort_unless($connection->user_id === $request->user()->id, 404);

        return response()->json([
            'data' => $connection,
        ]);
    }

    public function update(UpdateConnectionRequest $request, DbConnection $connection): JsonResponse
    {
        abort_unless($connection->user_id === $request->user()->id, 404);

        $data = $request->validated();

        if (isset($data['password'])) {
            $data['password_encrypted'] = encrypt($data['password']);
            unset($data['password']);
        }

        $connection->update($data);

        return response()->json([
            'data' => $connection,
        ]);
    }

    public function destroy(Request $request, DbConnection $connection): JsonResponse
    {
        abort_unless($connection->user_id === $request->user()->id, 404);

        $connection->delete();

        return response()->json([
            'message' => 'Connection deleted',
        ]);
    }
}
