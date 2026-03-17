<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Connection\StoreConnectionRequest;
use App\Http\Requests\Connection\TestConnectionRequest;
use App\Http\Requests\Connection\UpdateConnectionRequest;
use App\Models\DbConnection;
use App\Services\Database\ConnectionProbe;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

class DbConnectionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $connections = DbConnection::query()
            ->with(['shares:user_id,db_connection_id'])
            ->where(function (Builder $query) use ($userId) {
                $query
                    ->where('user_id', $userId)
                    ->orWhereHas('shares', function (Builder $shareQuery) use ($userId) {
                        $shareQuery->where('user_id', $userId);
                    });
            })
            ->orderByRaw('CASE WHEN user_id = ? THEN 0 ELSE 1 END', [$userId])
            ->orderBy('name')
            ->get()
            ->map(fn(DbConnection $connection) => $this->mapConnection($connection, $userId));

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
            'visibility' => $request->input('visibility', 'private'),
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
            'data' => $this->mapConnection($connection, $request->user()->id),
        ], 201);
    }

    public function show(Request $request, DbConnection $connection): JsonResponse
    {
        $this->authorizeConnectionRead($request, $connection);

        $connection->loadMissing(['shares:user_id,db_connection_id']);

        return response()->json([
            'data' => $this->mapConnection($connection, $request->user()->id),
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

        if (array_key_exists('ssh_password', $data)) {
            $data['ssh_password_encrypted'] = filled($data['ssh_password'])
                ? encrypt($data['ssh_password'])
                : null;

            unset($data['ssh_password']);
        }

        if (array_key_exists('ssh_private_key', $data)) {
            $data['ssh_private_key_encrypted'] = filled($data['ssh_private_key'])
                ? encrypt($data['ssh_private_key'])
                : null;

            unset($data['ssh_private_key']);
        }

        if (array_key_exists('ssh_passphrase', $data)) {
            $data['ssh_passphrase_encrypted'] = filled($data['ssh_passphrase'])
                ? encrypt($data['ssh_passphrase'])
                : null;

            unset($data['ssh_passphrase']);
        }

        $connection->update($data);

        return response()->json([
            'data' => $this->mapConnection($connection, $request->user()->id),
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

    public function test(TestConnectionRequest $request, ConnectionProbe $probe): JsonResponse
    {
        $connection = $this->makeProbeConnection(
            $request->validated(),
            $request->user()->id,
        );

        $result = $probe->probe($connection);

        return response()->json([
            'data' => $result,
        ]);
    }

    public function testExisting(
        TestConnectionRequest $request,
        DbConnection          $connection,
        ConnectionProbe       $probe,
    ): JsonResponse
    {
        abort_unless($connection->user_id === $request->user()->id, 404);

        $probeConnection = $this->makeProbeConnection(
            $request->validated(),
            $request->user()->id,
            $connection,
        );

        $result = $probe->probe($probeConnection);

        return response()->json([
            'data' => $result,
        ]);
    }

    // helpers
    protected function authorizeConnectionRead(Request $request, DbConnection $connection): void
    {
        $userId = $request->user()->id;

        abort_unless(
            $connection->isOwnedBy($userId) || $connection->isSharedWithUser($userId),
            404
        );
    }

    protected function mapConnection(DbConnection $connection, int $userId): array
    {
        return [
            'id' => $connection->id,
            'user_id' => $connection->user_id,
            'name' => $connection->name,
            'driver' => $connection->driver,
            'host' => $connection->host,
            'port' => $connection->port,
            'database_name' => $connection->database_name,
            'username' => $connection->username,
            'ssl_mode' => $connection->ssl_mode,
            'schema_default' => $connection->schema_default,
            'color' => $connection->color,
            'visibility' => $connection->visibility,
            'is_favorite' => (bool)$connection->is_favorite,
            'is_read_only' => (bool)$connection->is_read_only,
            'connect_timeout_seconds' => $connection->connect_timeout_seconds,
            'query_timeout_seconds' => $connection->query_timeout_seconds,
            'meta' => $connection->meta,
            'use_ssh_tunnel' => (bool)$connection->use_ssh_tunnel,
            'ssh_host' => $connection->ssh_host,
            'ssh_port' => $connection->ssh_port,
            'ssh_username' => $connection->ssh_username,
            'ssh_known_host_fingerprint' => $connection->ssh_known_host_fingerprint,
            'has_ssh_password' => $connection->has_ssh_password,
            'has_ssh_private_key' => $connection->has_ssh_private_key,
            'has_ssh_passphrase' => $connection->has_ssh_passphrase,
            'last_used_at' => optional($connection->last_used_at)?->toISOString(),
            'created_at' => optional($connection->created_at)?->toISOString(),
            'updated_at' => optional($connection->updated_at)?->toISOString(),
            'is_owner' => $connection->isOwnedBy($userId),
            'access_scope' => $connection->getAccessScopeFor($userId),
        ];
    }

    protected function makeProbeConnection(array $data, int $userId, ?DbConnection $base = null): DbConnection
    {
        $connection = $base ? $base->replicate() : new DbConnection();

        $connection->forceFill([
            'user_id' => $userId,
            'name' => $data['name'] ?? $base?->name ?? 'Test connection',
            'driver' => $data['driver'] ?? $base?->driver ?? 'pgsql',
            'host' => $data['host'] ?? $base?->host,
            'port' => $data['port'] ?? $base?->port ?? 5432,
            'database_name' => $data['database_name'] ?? $base?->database_name,
            'username' => $data['username'] ?? $base?->username,
            'ssl_mode' => $data['ssl_mode'] ?? $base?->ssl_mode,
            'schema_default' => $data['schema_default'] ?? $base?->schema_default,
            'color' => $data['color'] ?? $base?->color,
            'visibility' => $data['visibility'] ?? $base?->visibility ?? 'private',
            'is_read_only' => Arr::get($data, 'is_read_only', $base?->is_read_only ?? false),
            'connect_timeout_seconds' => Arr::get($data, 'connect_timeout_seconds', $base?->connect_timeout_seconds ?? 10),
            'query_timeout_seconds' => Arr::get($data, 'query_timeout_seconds', $base?->query_timeout_seconds),
            'use_ssh_tunnel' => Arr::get($data, 'use_ssh_tunnel', $base?->use_ssh_tunnel ?? false),
            'ssh_host' => Arr::get($data, 'ssh_host', $base?->ssh_host),
            'ssh_port' => Arr::get($data, 'ssh_port', $base?->ssh_port ?? 22),
            'ssh_username' => Arr::get($data, 'ssh_username', $base?->ssh_username),
            'ssh_known_host_fingerprint' => Arr::get($data, 'ssh_known_host_fingerprint', $base?->ssh_known_host_fingerprint),
        ]);

        if (array_key_exists('password', $data)) {
            $connection->password_encrypted = filled($data['password'])
                ? encrypt($data['password'])
                : $base?->password_encrypted;
        }

        if (array_key_exists('ssh_password', $data)) {
            $connection->ssh_password_encrypted = filled($data['ssh_password'])
                ? encrypt($data['ssh_password'])
                : null;
        } else if ($base) {
            $connection->ssh_password_encrypted = $base->ssh_password_encrypted;
        }

        if (array_key_exists('ssh_private_key', $data)) {
            $connection->ssh_private_key_encrypted = filled($data['ssh_private_key'])
                ? encrypt($data['ssh_private_key'])
                : null;
        } else if ($base) {
            $connection->ssh_private_key_encrypted = $base->ssh_private_key_encrypted;
        }

        if (array_key_exists('ssh_passphrase', $data)) {
            $connection->ssh_passphrase_encrypted = filled($data['ssh_passphrase'])
                ? encrypt($data['ssh_passphrase'])
                : null;
        } else if ($base) {
            $connection->ssh_passphrase_encrypted = $base->ssh_passphrase_encrypted;
        }

        return $connection;
    }
}
