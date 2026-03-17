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
}
