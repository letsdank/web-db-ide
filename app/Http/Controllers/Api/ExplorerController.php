<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DbConnection;
use App\Services\Database\DatabaseExplorerFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExplorerController extends Controller
{
    public function schemas(
        Request                 $request,
        DbConnection            $connection,
        DatabaseExplorerFactory $explorerFactory,
    ): JsonResponse
    {
        $this->authorizeConnectionRead($request, $connection);

        $schemas = $explorerFactory->for($connection)->schemas($connection);

        return response()->json([
            'data' => $schemas,
        ]);
    }

    public function tables(
        Request                 $request,
        DbConnection            $connection,
        string                  $schema,
        DatabaseExplorerFactory $explorerFactory,
    ): JsonResponse
    {
        $this->authorizeConnectionRead($request, $connection);

        $tables = $explorerFactory->for($connection)->tables($connection, $schema);

        return response()->json([
            'data' => $tables,
        ]);
    }

    public function table(
        Request                 $request,
        DbConnection            $connection,
        string                  $schema,
        string                  $table,
        DatabaseExplorerFactory $explorerFactory,
    ): JsonResponse
    {
        $this->authorizeConnectionRead($request, $connection);

        $explorer = $explorerFactory->for($connection);

        return response()->json([
            'schema' => $schema,
            'table' => $table,
            'columns' => $explorer->columns($connection, $schema, $table),
            'indexes' => $explorer->indexes($connection, $schema, $table),
        ]);
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
