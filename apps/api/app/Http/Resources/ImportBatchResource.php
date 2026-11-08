<?php

namespace App\Http\Resources;

use App\Domain\DataImports\Models\ImportBatch;
use App\Http\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ImportBatch */
final class ImportBatchResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->public_id,
            'source' => $this->source_name,
            'kind' => $this->kind->value,
            'source_version' => $this->source_version,
            'original_filename' => $this->original_filename,
            'usage_terms' => $this->usage_terms,
            'status' => $this->status->value,
            'current_step' => $this->current_step->value,
            'records_processed' => $this->records_processed,
            'counts' => $this->counts,
            'pending_flagged' => $this->when(isset($this->pending_flagged), fn () => (int) $this->pending_flagged),
            'error' => $this->error_summary,
            'started_by' => $this->whenLoaded('starter', fn () => $this->starter?->name),
            'published_by' => $this->whenLoaded('publisher', fn () => $this->publisher?->name),
            'created_at' => Time::iso($this->created_at),
            'started_at' => Time::iso($this->started_at),
            'finished_at' => Time::iso($this->finished_at),
            'published_at' => Time::iso($this->published_at),
        ];
    }
}
