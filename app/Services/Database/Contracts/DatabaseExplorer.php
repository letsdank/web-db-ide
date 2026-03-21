<?php

namespace App\Services\Database\Contracts;

use App\Models\DbConnection;

interface DatabaseExplorer
{
    public function schemas(DbConnection $connection): array;

    public function tables(DbConnection $connection, string $schema): array;

    public function columns(DbConnection $connection, string $schema, string $table): array;

    public function indexes(DbConnection $connection, string $schema, string $table): array;

    public function foreignKeys(DbConnection $connection, string $schema): array;
}
