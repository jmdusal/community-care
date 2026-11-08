<?php

namespace App\Http\Resources;

use App\Domain\Facilities\Models\FacilityChangeRequest;
use App\Http\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin FacilityChangeRequest */
final class ChangeRequestResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $user = $request->user();

        return [
            'id' => $this->public_id,
            'facility' => $this->whenLoaded('facility', fn () => [
                'id' => $this->facility->public_id,
                'name' => $this->facility->name,
                'publication_status' => $this->facility->publication_status->value,
            ]),
            'origin' => $this->origin->value,
            'status' => $this->status->value,
            'changes' => $this->changes,
            'note' => $this->note,
            'reason' => $this->reason,
            'submitted_by' => $this->whenLoaded('submitter', fn () => $this->submitter?->name),
            'reviewed_by' => $this->whenLoaded('reviewer', fn () => $this->reviewer?->name),
            'submitted_at' => Time::iso($this->created_at),
            'reviewed_at' => Time::iso($this->reviewed_at),
            'is_own' => $user !== null && $this->submitted_by === $user->id,
        ];
    }
}
