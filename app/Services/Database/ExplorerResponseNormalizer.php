<?php

namespace App\Services\Database;

class ExplorerResponseNormalizer
{
    public function normalizeSchemas(array $schemas): array
    {
        return array_values(array_map(
            static fn(mixed $schema) => (string)$schema,
            array_filter(
                $schemas,
                static fn(mixed $schema) => $schema !== null && $schema !== ''
            )
        ));
    }

    public function normalizeTables(array $tables): array
    {
        return array_values(array_map(
            fn(array $table) => $this->normalizeTable($table),
            $tables
        ));
    }

    public function normalizeTable(array $table): array
    {
        return [
            'table_name' => (string)($table['table_name'] ?? ''),
            'table_type' => (string)($table['table_type'] ?? ''),
        ];
    }

    public function normalizeColumns(array $columns): array
    {
        return array_values(array_map(
            fn(array $column) => $this->normalizeColumn($column),
            $columns
        ));
    }

    public function normalizeColumn(array $column): array
    {
        $isNullable = strtoupper((string)($column['is_nullable'] ?? 'YES'));

        return [
            'column_name' => (string)($column['column_name'] ?? ''),
            'data_type' => (string)($column['data_type'] ?? 'unknown'),
            'is_nullable' => $isNullable === 'NO' ? 'NO' : 'YES',
            'column_default' => array_key_exists('column_default', $column) && $column['column_default'] !== null
                ? (string)$column['column_default']
                : null,
        ];
    }

    public function normalizeIndexes(array $indexes): array
    {
        return array_values(array_map(
            fn(array $index) => $this->normalizeIndex($index),
            $indexes
        ));
    }

    public function normalizeIndex(array $index): array
    {
        return [
            'indexname' => (string)($index['indexname'] ?? ''),
            'indexdef' => (string)($index['indexdef'] ?? ''),
        ];
    }

    public function normalizeTableDetails(
        string $schema,
        string $table,
        array  $columns,
        array  $indexes,
    ): array
    {
        return [
            'schema' => $schema,
            'table' => $table,
            'columns' => $this->normalizeColumns($columns),
            'indexes' => $this->normalizeIndexes($indexes),
        ];
    }
}
