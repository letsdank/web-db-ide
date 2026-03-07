<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavedQuery extends Model
{
    protected $fillable = [
        'user_id',
        'db_connection_id',
        'title',
        'description',
        'sql_text',
        'folder',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function connection(): BelongsTo
    {
        return $this->belongsTo(DbConnection::class, 'db_connection_id');
    }
}
