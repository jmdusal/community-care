<?php

namespace App\Domain\DataImports\Models;

use App\Domain\DataImports\Data\FacilityRecordData;
use App\Domain\DataImports\Enums\MatchStatus;
use App\Domain\DataImports\Enums\StagingDecision;
use App\Domain\Facilities\Models\Facility;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'import_batch_id', 'row_number', 'source_record_id', 'payload', 'match_status', 'matched_facility_id',
    'flags', 'is_flagged', 'decision', 'decided_by', 'decided_at', 'decision_reason',
])]
class ImportStagingRecord extends Model
{
    /** @return BelongsTo<ImportBatch, $this> */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(ImportBatch::class, 'import_batch_id');
    }

    /** @return BelongsTo<Facility, $this> */
    public function matchedFacility(): BelongsTo
    {
        return $this->belongsTo(Facility::class, 'matched_facility_id');
    }

    /** @return HasMany<DuplicateCandidate, $this> */
    public function duplicateCandidates(): HasMany
    {
        return $this->hasMany(DuplicateCandidate::class, 'staging_record_id');
    }

    public function record(): FacilityRecordData
    {
        return FacilityRecordData::fromArray($this->payload);
    }

    /** Will this record be written when the batch is published? */
    public function isPublishable(): bool
    {
        if (! in_array($this->match_status, [MatchStatus::New, MatchStatus::Updated], true)) {
            return false;
        }

        return $this->is_flagged
            ? $this->decision === StagingDecision::Approved
            : $this->decision !== StagingDecision::Rejected;
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'flags' => 'array',
            'is_flagged' => 'boolean',
            'match_status' => MatchStatus::class,
            'decision' => StagingDecision::class,
            'decided_at' => 'datetime',
        ];
    }
}
