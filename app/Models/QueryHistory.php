<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QueryHistory extends Model
{
    protected $table = 'query_history';

    protected $fillable = [
        'user_id',
        'db_connection_id',
        'query_tab_id',
        'sql_text',
        'statement_count',
        'executed_at',
        'duration_ms',
        'status',
        'row_count',
        'error_message',
        'meta',
    ];

    protected $casts = [
        'statement_count' => 'integer',
        'executed_at' => 'datetime',
        'duration_ms' => 'integer',
        'row_count' => 'integer',
        'meta' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function connection(): BelongsTo
    {
        return $this->belongsTo(DbConnection::class, 'db_connection_id');
    }

    public function queryTab(): BelongsTo
    {
        return $this->belongsTo(QueryTab::class, 'query_tab_id');
    }
}
