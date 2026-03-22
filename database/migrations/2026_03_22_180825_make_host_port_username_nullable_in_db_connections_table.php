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
            $table->string('host')->nullable()->change();
            $table->unsignedInteger('port')->nullable()->change();
            $table->string('username')->nullable()->change();
            $table->text('password_encrypted')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('db_connections', function (Blueprint $table) {
            $table->string('host')->nullable(false)->change();
            $table->unsignedInteger('port')->nullable(false)->change();
            $table->string('username')->nullable(false)->change();
            $table->text('password_encrypted')->nullable(false)->change();
        });
    }
};
