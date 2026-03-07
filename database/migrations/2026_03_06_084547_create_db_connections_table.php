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
        Schema::create('db_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->string('name');
            $table->string('driver', 32)->default('pgsql');
            $table->string('host');
            $table->unsignedInteger('port')->default(5432);
            $table->string('database_name');
            $table->string('username');
            $table->text('password_encrypted');
            $table->string('ssl_mode')->nullable();
            $table->string('schema_default')->nullable();
            $table->string('color', 32)->nullable();

            $table->boolean('is_favorite')->default(false);
            $table->boolean('is_read_only')->default(false);

            $table->unsignedInteger('connect_timeout_seconds')->default(10);
            $table->unsignedInteger('query_timeout_seconds')->default(30);

            $table->json('meta')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('db_connections');
    }
};
