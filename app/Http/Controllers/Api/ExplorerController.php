<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DbConnection;
use App\Services\Database\PostgresExplorer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExplorerController extends Controller
{
    public function schemas(Request $request, DbConnection $connection, PostgresExplorer $explorer): JsonResponse
    {
        abort_unless($connection->user_id === $request->user()->id, 404);

        $schemas = $explorer->schemas($connection);

        return response()->json([
            'data' => $schemas,
        ]);
    }

    public function tables(
        Request          $request,
        DbConnection     $connection,
        string           $schema,
        PostgresExplorer $explorer
    ): JsonResponse
    {
        abort_unless($connection->user_id === $request->user()->id, 404);

        $tables = $explorer->tables($connection, $schema);

        return response()->json([
            'data' => $tables,
        ]);
    }

    public function table(
        Request          $request,
        DbConnection     $connection,
        string           $schema,
        string           $table,
        PostgresExplorer $explorer
    ): JsonResponse
    {
        abort_unless($connection->user_id === $request->user()->id,404);

        $columns=$explorer->columns($connection,$schema,$table);
        $indexes=$explorer->indexes($connection,$schema,$table);

        return response()->json([
            'schema'=>$schema,
            'table'=>$table,
            'columns'=>$columns,
            'indexes'=>$indexes,
        ]);
    }
}
