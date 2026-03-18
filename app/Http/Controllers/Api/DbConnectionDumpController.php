<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Connection\ExportDumpRequest;
use App\Models\DbConnection;
use App\Services\Database\PostgresDumpExporter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DbConnectionDumpController extends Controller
{
    public function export(
        ExportDumpRequest    $request,
        DbConnection         $connection,
        PostgresDumpExporter $exporter,
    ): BinaryFileResponse
    {
        $this->authorizeConnectionRead($request, $connection);

        return $exporter->export($connection, $request->validated());
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
