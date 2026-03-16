<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('db_connections', function (Blueprint $table) {
            $table->string('visibility', 32)
                ->default('private')
                ->after('color');

            $table->index(['user_id', 'visibility'], 'db_connections_user_visibility_idx');
        });

        Schema::table('saved_queries', function (Blueprint $table) {
            $table->string('visibility', 32)
                ->default('private')
                ->after('folder');

            $table->index(['user_id', 'visibility'], 'saved_queries_visibility_idx');
        });

        Schema::create('db_connection_shares', function (Blueprint $table) {
            $table->id();

            $table->foreignId('db_connection_id')
                ->constrained('db_connections')
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('granted_by_user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->timestamps();

            $table->unique(
                ['db_connection_id', 'user_id'],
                'db_connection_shares_connection_user_unique'
            );

            $table->index(['user_id'], 'db_connection_shares_user_idx');
        });

        Schema::create('saved_query_shares', function (Blueprint $table) {
            $table->id();

            $table->foreignId('saved_query_id')
                ->constrained('saved_queries')
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('granted_by_user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->timestamps();

            $table->unique(
                ['saved_query_id', 'user_id'],
                'saved_query_shares_query_user_unique'
            );

            $table->index(['user_id'], 'saved_query_shares_user_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('saved_query_shares');
        Schema::dropIfExists('db_connection_shares');

        Schema::table('saved_queries', function (Blueprint $table) {
            $table->dropIndex('saved_queries_user_visibility_idx');
            $table->dropColumn('visibility');
        });

        Schema::table('db_connections', function (Blueprint $table) {
            $table->dropIndex('db_connections_user_visibility_idx');
            $table->dropColumn('visibility');
        });
    }
};
