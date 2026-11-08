<?php

namespace App\Domain\Facilities\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['facility_id', 'date', 'is_closed', 'opens_at', 'closes_at', 'reason'])]
class FacilityHourException extends Model
{
    /** @return BelongsTo<Facility, $this> */
    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['date' => 'date', 'is_closed' => 'boolean'];
    }
}
