<?php

namespace App\Http\Resources;

use App\Domain\DataImports\Models\DuplicateCandidate;
use App\Domain\DataImports\Models\ImportStagingRecord;
use App\Http\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ImportStagingRecord */
final class ImportStagingRecordResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'row_number' => $this->row_number,
            'source_record_id' => $this->source_record_id,
            'match_status' => $this->match_status->value,
            'is_flagged' => $this->is_flagged,
            'flags' => $this->flags ?? [],
            'decision' => $this->decision->value,
            'decision_reason' => $this->decision_reason,
            'decided_at' => Time::iso($this->decided_at),
            'record' => $this->payload,
            'matched_facility' => $this->whenLoaded('matchedFacility', fn () => $this->matchedFacility === null ? null : [
                'id' => $this->matchedFacility->public_id,
                'name' => $this->matchedFacility->name,
                'latitude' => $this->matchedFacility->latitude,
                'longitude' => $this->matchedFacility->longitude,
            ]),
            'duplicates' => $this->whenLoaded('duplicateCandidates', fn () => $this->duplicateCandidates->map(fn (DuplicateCandidate $candidate): array => [
                'facility_id' => $candidate->facility?->public_id,
                'name' => $candidate->facility?->name,
                'score' => $candidate->score,
                'reason' => $candidate->reason,
            ])->values()),
        ];
    }
}
