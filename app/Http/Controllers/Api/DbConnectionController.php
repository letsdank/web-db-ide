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

            // SSH
            'ssh_password_encrypted' => $request->filled('ssh_password')
                ? encrypt($request->string('ssh_password')->toString())
                : null,

            'ssh_private_key_encrypted' => $request->filled('ssh_private_key')
                ? encrypt($request->string('ssh_private_key')->toString())
                : null,

            'ssh_passphrase_encrypted' => $request->filled('ssh_passphrase')
                ? encrypt($request->string('ssh_passphrase')->toString())
                : null,

            'use_ssh_tunnel' => $request->boolean('use_ssh_tunnel'),
            'ssh_host' => $request->input('ssh_host'),
            'ssh_port' => $request->integer('ssh_port') ?: 22,
            'ssh_username' => $request->input('ssh_username'),
            'ssh_known_host_fingerprint' => $request->input('ssh_known_host_fingerprint'),
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

        if (key_exists('ssh_password', $data)) {
            $data['ssh_password_encrypted'] = filled($data['ssh_password'])
                ? encrypt($data['ssh_password'])
                : null;

            unset($data['ssh_password']);
        }

        if (key_exists('ssh_private_key', $data)) {
            $data['ssh_private_key_encrypted'] = filled($data['ssh_private_key'])
                ? encrypt($data['ssh_private_key'])
                : null;

            unset($data['ssh_private_key']);
        }

        if (key_exists('ssh_passphrase', $data)) {
            $data['ssh_passphrase_encrypted'] = filled($data['ssh_passphrase'])
                ? encrypt($data['ssh_passphrase'])
                : null;

            unset($data['ssh_passphrase']);
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
