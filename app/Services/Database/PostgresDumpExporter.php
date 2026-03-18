<?php

namespace App\Services\Database;

use App\Models\DbConnection;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;

class PostgresDumpExporter
{
    public function __construct(
        protected ConnectionEndpointResolver $endpointResolver,
    )
    {
    }

    public function export(DbConnection $connection, array $options): BinaryFileResponse
    {
        if ($connection->driver !== 'pgsql') {
            throw ValidationException::withMessages([
                'driver' => 'Dump export is currently available only for PostgreSQL connections.',
            ]);
        }

        $resolved = $this->endpointResolver->resolve($connection);

        $tempDirectory = storage_path('app/tmp/dumps');

        if (!File::isDirectory($tempDirectory)) {
            File::makeDirectory($tempDirectory, 0755, true);
        }

        $extension = $options['format'] === 'custom' ? 'dump' : 'sql';
        $tempFile = $tempDirectory . '/' . uniqid('dump_', true) . '.' . $extension;

        try {
            $command = $this->buildCommand(
                connection: $connection,
                host: $resolved->host,
                port: $resolved->port,
                outputPath: $tempFile,
                options: $options,
            );

            $env = [
                'PGPASSWORD' => decrypt($connection->password_encrypted),
            ];

            if (filled($connection->ssl_mode)) {
                $env['PGSSLMODE'] = (string)$connection->ssl_mode;
            }

            $process = new Process($command, null, $env);
            $process->setTimeout(null);
            $process->mustRun();

            return response()->download(
                $tempFile,
                $this->buildFilename($connection, $options),
                [
                    'Content-Type' => $options['format'] === 'custom'
                        ? 'application/octet-stream'
                        : 'application/sql',
                ],
            )->deleteFileAfterSend();
        } catch (ProcessFailedException$exception) {
            if (File::exists($tempFile)) {
                File::delete($tempFile);
            }

            $output = trim($exception->getProcess()->getErrorOutput())
                ?: trim($exception->getProcess()->getOutput())
                    ?: 'Failed to export database dump.';

            throw ValidationException::withMessages([
                'dump' => $output,
            ]);
        } finally {
            $this->endpointResolver->cleanup($resolved);
        }
    }

    protected function buildCommand(
        DbConnection $connection,
        string       $host,
        int          $port,
        string       $outputPath,
        array        $options
    ): array
    {
        $command = [
            (string)config('database.pg_dump_binary', 'pg_dump'),
            '--host=' . $host,
            '--port=' . $port,
            '--username=' . $connection->username,
            '--dbname=' . $connection->database_name,
            '--file=' . $outputPath,
            '--format=' . ($options['format'] === 'custom' ? 'c' : 'p'),
        ];

        if ($options['section'] === 'schema') {
            $command[] = '--schema-only';
        }

        if ($options['section'] === 'data') {
            $command[] = '--data-only';
        }

        if ($options['scope'] === 'schema' && filled($options['schema'])) {
            $command[] = '--schema=' . $this->quoteIdentifier($options['schema']);
        }

        if ($options['scope'] === 'table' && filled($options['schema']) && filled($options['table'])) {
            $command[] = '--table=' . $this->quoteIdentifier($options['schema']) . '.' . $this->quoteIdentifier($options['table']);
        }

        if ($options['clean']) {
            $command[] = '--clean';
        }

        if ($options['clean'] && $options['if_exists']) {
            $command[] = '--if-exists';
        }

        if ($options['no_owner']) {
            $command[] = '--no-owner';
        }

        if ($options['no_privileges']) {
            $command[] = '--no-privileges';
        }

        if ($options['include_blobs']) {
            $command[] = '--blobs';
        }

        return $command;
    }

    protected function buildFilename(DbConnection $connection, array $options): string
    {
        $base = $this->sanitizeFilenamePart($connection->database_name ?: 'database');

        if ($options['scope'] === 'schema' && filled($options['schema'])) {
            $base .= '__schema__' . $this->sanitizeFilenamePart($options['schema']);
        }

        if ($options['scope'] === 'table' && filled($options['schema']) && filled($options['table'])) {
            $base .= '__table__'
                . $this->sanitizeFilenamePart($options['schema'])
                . '__'
                . $this->sanitizeFilenamePart($options['table']);
        }

        $base .= '__' . now()->format('Y-m-d_H-i-s');

        return $base . '.' . ($options['format'] === 'custom' ? 'dump' : 'sql');
    }

    protected function quoteIdentifier(string $value): string
    {
        return '"' . str_replace('"', '""', $value) . '"';
    }

    protected function sanitizeFilenamePart(string $value): string
    {
        return preg_replace('/[^a-zA-Z0-9._-]+/', '_', $value) ?: 'item';
    }
}
