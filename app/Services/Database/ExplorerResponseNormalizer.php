<?php

namespace App\Services\Database;

/**
 * Normalizes raw explorer payloads returned by driver-specific explorers into a
 * stable API shape consumed by the frontend.
 *
 * This keep minor driver quirks out of controllers and makes the explorer
 * response contract easier to reason about and test.
 */
class ExplorerResponseNormalizer
{
    /**
     * @param array<mixed> $schemas
     * @return list<string>
     */
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

    /**
     * @param array<array<string, mixed>> $tables
     * @return list<array{table_name: string, table_type: string}>
     */
    public function normalizeTables(array $tables): array
    {
        return array_values(array_map(
            fn(array $table) => $this->normalizeTable($table),
            $tables
        ));
    }

    /**
     * @param array<string, mixed> $table
     * @return array{table_name: string, table_type: string}
     */
    public function normalizeTable(array $table): array
    {
        return [
            'table_name' => (string)($table['table_name'] ?? ''),
            'table_type' => (string)($table['table_type'] ?? ''),
        ];
    }

    /**
     * @param array<array<string, mixed>> $columns
     * @return list<array{column_name: string, data_type: string, is_nullable: 'YES'|'NO', column_default: ?string}>
     */
    public function normalizeColumns(array $columns): array
    {
        return array_values(array_map(
            fn(array $column) => $this->normalizeColumn($column),
            $columns
        ));
    }

    /**
     * @param array<string, mixed> $column
     * @return array{column_name: string, data_type: string, is_nullable: 'YES'|'NO', column_default: ?string}
     */
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

    /**
     * @param array<array<string, mixed>> $indexes
     * @return list<array{indexname:string, indexdef: string}>
     */
    public function normalizeIndexes(array $indexes): array
    {
        return array_values(array_map(
            fn(array $index) => $this->normalizeIndex($index),
            $indexes
        ));
    }

    /**
     * @param array<string, mixed> $index
     * @return array{indexname: string, indexdef: string}
     */
    public function normalizeIndex(array $index): array
    {
        return [
            'indexname' => (string)($index['indexname'] ?? ''),
            'indexdef' => (string)($index['indexdef'] ?? ''),
        ];
    }

    /**
     * Builds the full table-details payload expected by the explorer sidebar.
     *
     * @param array<array<string, mixed>> $columns
     * @param array<array<string, mixed>> $indexes
     * @return array{
     *     schema: string,
     *     table: string,
     *     columns: list<array{column_name: string, data_type: string, is_nullable: 'YES'|'NO', column_default: ?string}>,
     *     indexes: list<array{indexname: string, indexdef: string}>
     * }
     */
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
