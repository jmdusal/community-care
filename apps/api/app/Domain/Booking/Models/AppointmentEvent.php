<?php

namespace App\Domain\Booking\Models;

use App\Domain\Identity\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One status change in an appointment's history. */
#[Fillable(['appointment_id', 'actor_id', 'from_status', 'to_status', 'note', 'created_at'])]
class AppointmentEvent extends Model
{
    public const UPDATED_AT = null;

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }
}
