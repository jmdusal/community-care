<?php

namespace App\Domain\Facilities\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['facility_id', 'contact_type', 'value', 'is_public'])]
class FacilityContact extends Model
{
    /** @return BelongsTo<Facility, $this> */
    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['is_public' => 'boolean'];
    }
}
