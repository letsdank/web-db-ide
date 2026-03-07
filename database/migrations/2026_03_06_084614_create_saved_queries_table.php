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
        Schema::create('saved_queries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('db_connection_id')->nullable()->constrained('db_connections')->nullOnDelete();

            $table->string('title');
            $table->text('description')->nullable();
            $table->longText('sql_text');
            $table->string('folder')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'title'], 'saved_queries_user_title_idx');
            $table->index(['user_id', 'folder'], 'saved_queries_user_folder_idx');
            $table->index(['db_connection_id'], 'saved_queries_connection_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('saved_queries');
    }
};
