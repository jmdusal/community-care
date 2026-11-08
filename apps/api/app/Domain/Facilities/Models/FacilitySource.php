<?php

namespace App\Domain\Facilities\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['facility_id', 'source_name', 'source_url', 'source_record_id', 'payload_hash', 'checked_at', 'imported_at'])]
class FacilitySource extends Model
{
    /** @return BelongsTo<Facility, $this> */
    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['checked_at' => 'datetime', 'imported_at' => 'datetime'];
    }
}
