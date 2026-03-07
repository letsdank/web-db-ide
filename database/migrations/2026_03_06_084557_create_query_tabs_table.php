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
        Schema::create('query_tabs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('db_connection_id')->nullable()->constrained('db_connections')->nullOnDelete();

            $table->string('title')->default('New Query');
            $table->longText('sql_text')->nullable();
            $table->text('selected_text')->nullable();
            $table->json('cursor_position')->nullable();
            $table->json('selection_range')->nullable();

            $table->boolean('is_pinned')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamp('last_executed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('query_tabs');
    }
};
