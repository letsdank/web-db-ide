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
            $table->boolean('use_ssh_tunnel')->default(false)->after('ssl_mode');

            $table->string('ssh_host')->nullable()->after('use_ssh_tunnel');
            $table->unsignedInteger('ssh_port')->nullable()->after('ssh_host');
            $table->string('ssh_username')->nullable()->after('ssh_port');

            $table->text('ssh_password_encrypted')->nullable()->after('ssh_username');
            $table->text('ssh_private_key_encrypted')->nullable()->after('ssh_password_encrypted');
            $table->text('ssh_passphrase_encrypted')->nullable()->after('ssh_private_key_encrypted');

            $table->string('ssh_known_host_fingerprint')->nullable()->after('ssh_passphrase_encrypted');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('db_connections', function (Blueprint $table) {
            $table->dropColumn([
                'use_ssh_tunnel',
                'ssh_host',
                'ssh_port',
                'ssh_username',
                'ssh_password_encrypted',
                'ssh_private_key_encrypted',
                'ssh_passphrase_encrypted',
                'ssh_known_host_fingerprint',
            ]);
        });
    }
};
