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
        'schema_default',
        'color',
        'is_favorite',
        'is_read_only',
        'connect_timeout_seconds',
        'query_timeout_seconds',
        'meta',
        'last_used_at',
    ];

    protected $casts = [
        'port' => 'integer',
        'is_favorite' => 'boolean',
        'is_read_only' => 'boolean',
        'connect_timeout_seconds' => 'integer',
        'query_timeout_seconds' => 'integer',
        'meta' => 'array',
        'last_used_at' => 'datetime',
    ];

    protected $hidden = [
        'password_encrypted',
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
}
