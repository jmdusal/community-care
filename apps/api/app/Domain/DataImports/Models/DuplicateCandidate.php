<?php

namespace App\Domain\DataImports\Models;

use App\Domain\Facilities\Models\Facility;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['import_batch_id', 'staging_record_id', 'facility_id', 'reason', 'score', 'resolution', 'resolved_by', 'resolved_at'])]
class DuplicateCandidate extends Model
{
    /** @return BelongsTo<Facility, $this> */
    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['resolved_at' => 'datetime'];
    }
}
