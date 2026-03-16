<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SavedQuery extends Model
{
    protected $fillable = [
        'user_id',
        'db_connection_id',
        'title',
        'description',
        'sql_text',
        'folder',
        'visibility',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function connection(): BelongsTo
    {
        return $this->belongsTo(DbConnection::class, 'db_connection_id');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(SavedQueryShare::class, 'saved_query_id');
    }

    public function isShared(): bool
    {
        return $this->visibility === 'shared';
    }
}
