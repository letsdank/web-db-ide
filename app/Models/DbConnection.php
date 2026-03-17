<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DbConnection extends Model
{
    protected $table = 'db_connections';

    protected $fillable = [
        'user_id',
        'name',
        'driver',
        'host',
        'port',
        'database_name',
        'username',
        'password_encrypted',
        'ssl_mode',
        'use_ssh_tunnel',
        'ssh_host',
        'ssh_port',
        'ssh_username',
        'ssh_password_encrypted',
        'ssh_private_key_encrypted',
        'ssh_passphrase_encrypted',
        'ssh_known_host_fingerprint',
        'schema_default',
        'color',
        'visibility',
        'is_favorite',
        'is_read_only',
        'connect_timeout_seconds',
        'query_timeout_seconds',
        'meta',
        'last_used_at',
    ];

    protected $casts = [
        'port' => 'integer',
        'use_ssh_tunnel' => 'boolean',
        'is_favorite' => 'boolean',
        'is_read_only' => 'boolean',
        'connect_timeout_seconds' => 'integer',
        'query_timeout_seconds' => 'integer',
        'meta' => 'array',
        'last_used_at' => 'datetime',
    ];

    protected $hidden = [
        'password_encrypted',
        'ssh_password_encrypted',
        'ssh_private_key_encrypted',
        'ssh_passphrase_encrypted',
    ];

    protected $appends = [
        'has_ssh_password',
        'has_ssh_private_key',
        'has_ssh_passphrase',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function queryTabs(): HasMany
    {
        return $this->hasMany(QueryTab::class, 'db_connection_id');
    }

    public function queryHistory(): HasMany
    {
        return $this->hasMany(QueryHistory::class, 'db_connection_id');
    }

    public function queryExecutions(): HasMany
    {
        return $this->hasMany(QueryExecution::class, 'db_connection_id');
    }

    public function savedQueries(): HasMany
    {
        return $this->hasMany(SavedQuery::class, 'db_connection_id');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(DbConnectionShare::class, 'db_connection_id');
    }

    public function usesSshTunnel(): bool
    {
        return (bool)$this->use_ssh_tunnel;
    }

    public function isShared(): bool
    {
        return $this->visibility === 'shared';
    }

    public function isOwnedBy(int $userId): bool
    {
        return (int)$this->user_id === $userId;
    }

    public function isSharedWithUser(int $userId): bool
    {
        if ($this->relationLoaded('shares')) {
            return $this->shares->contains(fn(DbConnectionShare $share) => (int)$share->user_id === $userId);
        }

        return $this->shares()
            ->where('user_id', $userId)
            ->exists();
    }

    public function getAccessScopeFor(int $userId): string
    {
        return $this->isOwnedBy($userId) ? 'owned' : 'shared_with_me';
    }

    public function getHasSshPasswordAttribute(): bool
    {
        return filled($this->ssh_password_encrypted);
    }

    public function getHasSshPrivateKeyAttribute(): bool
    {
        return filled($this->ssh_private_key_encrypted);
    }

    public function getHasSshPassphraseAttribute(): bool
    {
        return filled($this->ssh_passphrase_encrypted);
    }
}
