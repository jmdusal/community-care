<?php

namespace App\Http\Resources;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityChangeRequest;
use App\Domain\Facilities\Support\FacilitySnapshot;
use App\Http\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin view of a facility: adds review fields the public never sees.
 *
 * @mixin Facility
 */
final class AdminFacilityResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->public_id,
            'name' => $this->name,
            'type' => $this->type?->name,
            'address' => $this->address,
            'city' => $this->cityMunicipality?->name,
            'region' => $this->region?->name,
            'verification_status' => $this->verification_status->value,
            'publication_status' => $this->publication_status->value,
            'booking_enabled' => (bool) $this->booking_enabled,
            'verified_at' => Time::iso($this->verified_at),
            'verification_method' => $this->verification_method,
            'review_notes' => $this->review_notes,
            'sources' => $this->whenLoaded('sources', fn () => $this->sources->pluck('source_name')->unique()->values()),
            'pending_changes' => $this->whenCounted('changeRequests', fn () => $this->change_requests_count),
            'updated_at' => Time::iso($this->updated_at),
            $this->mergeWhen($request->routeIs('v1.admin.facilities.show'), fn (): array => [
                'current' => FacilitySnapshot::of($this->resource),
                'verified_by' => $this->verifier?->name,
                'staff' => $this->staff->map(fn ($user): array => ['id' => $user->public_id, 'name' => $user->name])->values(),
                'change_requests' => ChangeRequestResource::collection($this->changeRequests()->with(['submitter:id,name', 'reviewer:id,name'])->latest('id')->limit(10)->get()->each(fn (FacilityChangeRequest $r) => $r->setRelation('facility', $this->resource))),
            ]),
        ];
    }
}
