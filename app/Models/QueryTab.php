<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QueryTab extends Model
{
    protected $table = 'query_tabs';

    protected $fillable = [
        'user_id',
        'db_connection_id',
        'result_limit',
        'title',
        'sql_text',
        'selected_text',
        'cursor_position',
        'selection_range',
        'is_pinned',
        'sort_order',
        'last_executed_at',
    ];

    protected $casts = [
        'result_limit' => 'integer',
        'cursor_position' => 'array',
        'selection_range' => 'array',
        'is_pinned' => 'boolean',
        'sort_order' => 'integer',
        'last_executed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function connection(): BelongsTo
    {
        return $this->belongsTo(DbConnection::class, 'db_connection_id');
    }

    public function executions(): HasMany
    {
        return $this->hasMany(QueryExecution::class, 'query_tab_id');
    }

    public function history(): HasMany
    {
        return $this->hasMany(QueryHistory::class, 'query_tab_id');
    }
}
