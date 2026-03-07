<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QueryExecution extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'db_connection_id',
        'query_tab_id',
        'sql_text',
        'status',
        'started_at',
        'finished_at',
        'duration_ms',
        'result_meta',
        'error_message',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'result_meta' => 'array',
        'duration_ms' => 'integer',
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
