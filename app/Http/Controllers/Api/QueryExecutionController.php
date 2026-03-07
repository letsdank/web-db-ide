<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QueryExecution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QueryExecutionController extends Controller
{
    public function show(Request $request, QueryExecution $execution): JsonResponse
    {
        abort_unless($execution->user_id === $request->user()->id, 404);

        return response()->json([
            'data' => $execution,
        ]);
    }
}
