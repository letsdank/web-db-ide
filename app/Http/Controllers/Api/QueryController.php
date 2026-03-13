<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Query\ExecuteQueryRequest;
use App\Models\DbConnection;
use App\Models\QueryExecution;
use App\Models\QueryHistory;
use App\Services\Database\QueryExecutor;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Throwable;

class QueryController extends Controller
{
    public function execute(ExecuteQueryRequest $request, QueryExecutor $executor): JsonResponse
    {
        $connection = DbConnection::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($request->integer('connection_id'));

        $sql = trim($request->input('selected_sql') ?: $request->input('sql'));

        $execution = QueryExecution::query()->create([
            'id' => (string)Str::uuid(),
            'user_id' => $request->user()->id,
            'db_connection_id' => $connection->id,
            'query_tab_id' => $request->input('query_tab_id'),
            'sql_text' => $sql,
            'status' => 'running',
            'started_at' => now(),
        ]);

        try {
            $result = $executor->execute(
                $connection,
                $sql,
                (int)$request->input('max_rows', 500)
            );

            $execution->update([
                'status' => 'success',
                'finished_at' => now(),
                'duration_ms' => $result['duration_ms'],
                'result_meta' => [
                    'row_count' => $result['row_count'],
                    'has_more' => $result['has_more'],
                ],
            ]);

            if ($request->boolean('save_to_history', true)) {
                QueryHistory::query()->create([
                    'user_id' => $request->user()->id,
                    'db_connection_id' => $connection->id,
                    'query_tab_id' => $request->input('query_tab_id'),
                    'sql_text' => $sql,
                    'statement_count' => 1,
                    'executed_at' => now(),
                    'duration_ms' => $result['duration_ms'],
                    'status' => 'success',
                    'row_count' => $result['row_count'],
                ]);
            }

            return response()->json([
                'execution_id' => $execution->id,
                'status' => 'success',
                'duration_ms' => $result['duration_ms'],
                'columns' => $result['columns'],
                'rows' => $result['rows'],
                'row_count' => $result['row_count'],
                'has_more' => $result['has_more'],
            ]);
        } catch (Throwable $e) {
            $execution->update([
                'status' => 'error',
                'finished_at' => now(),
                'error_message' => $e->getMessage(),
            ]);

            if ($request->boolean('save_to_history', true)) {
                QueryHistory::query()->create([
                    'user_id' => $request->user()->id,
                    'db_connection_id' => $connection->id,
                    'query_tab_id' => $request->input('query_tab_id'),
                    'sql_text' => $sql,
                    'statement_count' => 1,
                    'executed_at' => now(),
                    'status' => 'error',
                    'error_message' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'execution_id' => $execution->id,
                'status' => 'error',
                'error' => $e->getMessage(),
            ], 422);
        }
    }
}
