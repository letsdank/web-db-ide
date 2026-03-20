<?php

namespace Tests\Unit\Database;

use App\Services\Database\ExplorerResponseNormalizer;
use Tests\TestCase;

class ExplorerResponseNormalizerTest extends TestCase
{
    public function test_it_normalizes_schemas(): void
    {
        $normalizer = new ExplorerResponseNormalizer();

        $result = $normalizer->normalizeSchemas([
            'public',
            null,
            '',
            'analytics',
        ]);

        $this->assertSame(['public', 'analytics'], $result);
    }

    public function test_it_normalizes_tables(): void
    {
        $normalizer = new ExplorerResponseNormalizer();

        $result = $normalizer->normalizeTables([
            ['table_name' => 'users', 'table_type' => 'BASE TABLE'],
            ['table_name' => 'events'],
        ]);

        $this->assertSame([
            ['table_name' => 'users', 'table_type' => 'BASE TABLE'],
            ['table_name' => 'events', 'table_type' => ''],
        ], $result);
    }

    public function test_it_normalizes_columns(): void
    {
        $normalizer = new ExplorerResponseNormalizer();

        $result = $normalizer->normalizeColumns([
            [
                'column_name' => 'id',
                'data_type' => 'bigint',
                'is_nullable' => 'NO',
                'column_default' => null,
            ],
            [
                'column_name' => 'email',
                'data_type' => 'varchar',
                'is_nullable' => 'yes',
                'column_default' => 'NULL',
            ],
            [
                'column_name' => 'payload',
            ],
        ]);

        $this->assertSame([
            [
                'column_name' => 'id',
                'data_type' => 'bigint',
                'is_nullable' => 'NO',
                'column_default' => null,
            ],
            [
                'column_name' => 'email',
                'data_type' => 'varchar',
                'is_nullable' => 'YES',
                'column_default' => 'NULL',
            ],
            [
                'column_name' => 'payload',
                'data_type' => 'unknown',
                'is_nullable' => 'YES',
                'column_default' => null,
            ],
        ], $result);
    }

    public function test_it_normalizes_indexes(): void
    {
        $normalizer = new ExplorerResponseNormalizer();

        $result = $normalizer->normalizeIndexes([
            ['indexname' => 'users_pkey', 'indexdef' => 'PRIMARY KEY (id)'],
            ['indexname' => 'users_email_idx'],
        ]);

        $this->assertSame([
            ['indexname' => 'users_pkey', 'indexdef' => 'PRIMARY KEY (id)'],
            ['indexname' => 'users_email_idx', 'indexdef' => ''],
        ], $result);
    }

    public function test_it_normalizes_table_details(): void
    {
        $normalizer = new ExplorerResponseNormalizer();

        $result = $normalizer->normalizeTableDetails(
            'public',
            'users',
            [
                ['column_name' => 'id', 'data_type' => 'bigint', 'is_nullable' => 'NO', 'column_default' => null],
            ],
            [
                ['indexname' => 'users_pkey', 'indexdef' => 'PRIMARY KEY (id)'],
            ],
        );

        $this->assertSame([
            'schema' => 'public',
            'table' => 'users',
            'columns' => [
                ['column_name' => 'id', 'data_type' => 'bigint', 'is_nullable' => 'NO', 'column_default' => null],
            ],
            'indexes' => [
                ['indexname' => 'users_pkey', 'indexdef' => 'PRIMARY KEY (id)'],
            ],
        ], $result);
    }
}
