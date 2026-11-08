<?php

namespace App\Domain\Shared\Notifications;

use App\Domain\Identity\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** An Expo push token for one device. */
#[Fillable(['user_id', 'token', 'platform', 'last_used_at'])]
class PushToken extends Model
{
    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['last_used_at' => 'datetime'];
    }
}
