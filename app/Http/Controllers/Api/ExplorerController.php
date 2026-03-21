<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DbConnection;
use App\Services\Database\DatabaseExplorerFactory;
use App\Services\Database\ExplorerResponseNormalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExplorerController extends Controller
{
    public function schemas(
        Request                    $request,
        DbConnection               $connection,
        DatabaseExplorerFactory    $explorerFactory,
        ExplorerResponseNormalizer $normalizer,
    ): JsonResponse
    {
        $this->authorizeConnectionRead($request, $connection);

        $schemas = $explorerFactory->for($connection)->schemas($connection);

        return response()->json([
            'data' => $normalizer->normalizeSchemas($schemas),
        ]);
    }

    public function tables(
        Request                    $request,
        DbConnection               $connection,
        string                     $schema,
        DatabaseExplorerFactory    $explorerFactory,
        ExplorerResponseNormalizer $normalizer,
    ): JsonResponse
    {
        $this->authorizeConnectionRead($request, $connection);

        $tables = $explorerFactory->for($connection)->tables($connection, $schema);

        return response()->json([
            'data' => $normalizer->normalizeTables($tables),
        ]);
    }

    public function table(
        Request                    $request,
        DbConnection               $connection,
        string                     $schema,
        string                     $table,
        DatabaseExplorerFactory    $explorerFactory,
        ExplorerResponseNormalizer $normalizer,
    ): JsonResponse
    {
        $this->authorizeConnectionRead($request, $connection);

        $explorer = $explorerFactory->for($connection);

        return response()->json(
            $normalizer->normalizeTableDetails(
                $schema,
                $table,
                $explorer->columns($connection, $schema, $table),
                $explorer->indexes($connection, $schema, $table),
            )
        );
    }

    public function foreignKeys(
        Request                 $request,
        DbConnection            $connection,
        string                  $schema,
        DatabaseExplorerFactory $explorerFactory): JsonResponse
    {
        $this->authorizeConnectionRead($request, $connection);

        $foreignKeys = $explorerFactory->for($connection)->foreignKeys($connection, $schema);

        return response()->json(['data' => $foreignKeys]);
    }

    protected function authorizeConnectionRead(Request $request, DbConnection $connection): void
    {
        $userId = $request->user()->id;

        abort_unless(
            $connection->isOwnedBy($userId) || $connection->isSharedWithUser($userId),
            404
        );
    }
}
