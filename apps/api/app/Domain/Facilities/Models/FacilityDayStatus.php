<?php

namespace App\Domain\Facilities\Models;

use App\Domain\Identity\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** What staff say about the facility today: doctor in or out, open or closed, out-of-stock items, a note. */
#[Fillable(['facility_id', 'status_date', 'doctor', 'opening', 'closes_at', 'out_of_stock', 'note', 'updated_by'])]
class FacilityDayStatus extends Model
{
    public const DOCTOR = ['in', 'out'];

    public const OPENING = ['open', 'closing_early', 'closed'];

    /** @return BelongsTo<User, $this> */
    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['status_date' => 'date', 'out_of_stock' => 'array'];
    }
}
