<?php

namespace App\Http\Resources;

use App\Domain\Booking\Models\ClinicAvailability;
use App\Http\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ClinicAvailability */
final class AvailabilityResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->public_id,
            'starts_at' => Time::iso($this->starts_at),
            'ends_at' => Time::iso($this->ends_at),
            'service' => $this->service === null ? null : ['slug' => $this->service->slug, 'name' => $this->service->name],
            'seats_left' => $this->seatsLeft(),
            'capacity' => $this->when($request->routeIs('v1.admin.*'), $this->capacity),
            'booked' => $this->when($request->routeIs('v1.admin.*'), $this->booked_count),
            'status' => $this->when($request->routeIs('v1.admin.*'), $this->status),
        ];
    }
}
