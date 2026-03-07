<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('query_executions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('db_connection_id')->constrained('db_connections')->cascadeOnDelete();
            $table->foreignId('query_tab_id')->nullable()->constrained('query_tabs')->nullOnDelete();

            $table->longText('sql_text');
            $table->string('status', 16);
            $table->timestamp('started_at');
            $table->timestamp('finished_at')->nullable();
            $table->unsignedBigInteger('duration_ms')->nullable();
            $table->json('result_meta')->nullable();
            $table->text('error_message')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'started_at'], 'query_executions_user_started_idx');
            $table->index(['status'], 'query_executions_started_idx');
            $table->index(['db_connection_id', 'started_at'], 'query_executions_connection_started_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('query_executions');
    }
};
