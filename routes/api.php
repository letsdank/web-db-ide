<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DbConnectionController;
use App\Http\Controllers\Api\ExplorerController;
use App\Http\Controllers\Api\QueryController;
use App\Http\Controllers\Api\QueryExecutionController;
use App\Http\Controllers\Api\QueryHistoryController;
use App\Http\Controllers\Api\QueryTabController;
use App\Http\Controllers\Api\SavedQueryController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // saved queries
    Route::get('/saved-queries', [SavedQueryController::class, 'index']);
    Route::post('/saved-queries', [SavedQueryController::class, 'store']);
    Route::get('/saved-queries/{savedQuery}', [SavedQueryController::class, 'show']);
    Route::put('/saved-queries/{savedQuery}', [SavedQueryController::class, 'update']);
    Route::patch('/saved-queries/{savedQuery}', [SavedQueryController::class, 'update']);
    Route::delete('/saved-queries/{savedQuery}', [SavedQueryController::class, 'destroy']);

    // query tabs
    Route::get('/query-tabs', [QueryTabController::class, 'index']);
    Route::post('/query-tabs', [QueryTabController::class, 'store']);
    Route::patch('/query-tabs/reorder', [QueryTabController::class, 'reorder']);
    Route::get('/query-tabs/{queryTab}', [QueryTabController::class, 'show']);
    Route::put('/query-tabs/{queryTab}', [QueryTabController::class, 'update']);
    Route::patch('/query-tabs/{queryTab}', [QueryTabController::class, 'update']);
    Route::delete('/query-tabs/{queryTab}', [QueryTabController::class, 'destroy']);

    // execute sql
    Route::post('/queries/execute', [QueryController::class, 'execute']);

    // connections
    Route::post('/connections/test', [DbConnectionController::class, 'test']);
    Route::post('/connections/{connection}/test', [DbConnectionController::class, 'testExisting']);

    Route::apiResource('connections', DbConnectionController::class);

    // query history
    Route::get('/query-history', [QueryHistoryController::class, 'index']);
    Route::get('/query-history/{history}', [QueryHistoryController::class, 'show']);
    Route::delete('/query-history/{history}', [QueryHistoryController::class, 'destroy']);

    // executions
    Route::get('/query-execution/{execution}', [QueryExecutionController::class, 'show']);

    // explorer
    Route::get('/connections/{connection}/schemas', [ExplorerController::class, 'schemas']);
    Route::get('/connections/{connection}/schemas/{schema}/tables', [ExplorerController::class, 'tables']);
    Route::get('/connections/{connection}/tables/{schema}/{table}', [ExplorerController::class, 'table']);
});

