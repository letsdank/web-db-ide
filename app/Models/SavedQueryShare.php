<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavedQueryShare extends Model
{
    protected $fillable = [
        'saved_query_id',
        'user_id',
        'granted_by_user_id',
    ];

    public function savedQuery(): BelongsTo
    {
        return $this->belongsTo(SavedQuery::class, 'saved_query_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function grantedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'granted_by_user_id');
    }
}
