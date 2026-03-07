<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QueryHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QueryHistoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $history = QueryHistory::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('executed_at')
            ->limit(200)
            ->get();

        return response()->json([
            'data' => $history,
        ]);
    }

    public function show(Request $request, QueryHistory $history): JsonResponse
    {
        abort_unless($history->user_id === $request->user()->id, 404);

        return response()->json([
            'data' => $history,
        ]);
    }

    public function destroy(Request $request, QueryHistory $history): JsonResponse
    {
        abort_unless($history->user_id === $request->user()->id, 404);

        $history->delete();

        return response()->json([
            'message' => 'History deleted',
        ]);
    }
}
