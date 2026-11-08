<?php

namespace App\Domain\Facilities\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** day_of_week follows ISO-8601: 1 = Monday … 7 = Sunday. */
#[Fillable(['facility_id', 'day_of_week', 'opens_at', 'closes_at', 'notes'])]
class FacilityHour extends Model
{
    /** @return BelongsTo<Facility, $this> */
    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }
}
