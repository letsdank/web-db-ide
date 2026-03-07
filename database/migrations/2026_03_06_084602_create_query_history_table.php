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
        Schema::create('query_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('db_connection_id')->constrained('db_connections')->cascadeOnDelete();
            $table->foreignId('query_tab_id')->nullable()->constrained('query_tabs')->nullOnDelete();

            $table->longText('sql_text');
            $table->unsignedInteger('statement_count')->default(1);
            $table->timestamp('executed_at');
            $table->unsignedBigInteger('duration_ms')->nullable();
            $table->string('status', 16);
            $table->unsignedBigInteger('row_count')->nullable();
            $table->text('error_message')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'executed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('query_history');
    }
};
