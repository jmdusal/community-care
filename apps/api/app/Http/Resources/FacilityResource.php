<?php

namespace App\Http\Resources;

use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityContact;
use App\Domain\Facilities\Models\FacilityHour;
use App\Domain\Facilities\Models\FacilityHourException;
use App\Domain\Facilities\Models\FacilitySource;
use App\Domain\HealthPrograms\Models\HealthProgram;
use App\Domain\Services\Models\Service;
use App\Domain\Settings\Contracts\SettingsRepository;
use App\Http\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public facility shape. Never exposes internal fields (review_notes,
 * verified_by, internal ids). Detail-only sections appear when loaded.
 *
 * @mixin Facility
 */
final class FacilityResource extends JsonResource
{
    public const VERIFICATION_NOTICE = 'Platform review status, not a license or accreditation.';

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $source = $this->relationLoaded('sources') ? $this->sources->sortByDesc('checked_at')->first() : null;

        return [
            'id' => $this->public_id,
            'name' => $this->name,
            'type' => $this->type === null ? null : ['slug' => $this->type->slug, 'name' => $this->type->name],
            'address' => $this->address,
            'location' => [
                'region' => $this->area($this->region),
                'province' => $this->area($this->province),
                'city' => $this->area($this->cityMunicipality),
                'barangay' => $this->area($this->barangay),
            ],
            'coordinates' => $this->latitude === null ? null : ['lat' => $this->latitude, 'lng' => $this->longitude],
            'distance_km' => $this->when(isset($this->distance_km), fn () => round((float) $this->distance_km, 2)),
            'verification' => [
                'status' => $this->verification_status->value,
                'verified_at' => Time::iso($this->verified_at),
                'is_stale' => $this->verification_status === VerificationStatus::Stale,
                'notice' => self::VERIFICATION_NOTICE,
            ],
            'source' => $source === null ? null : ['name' => $source->source_name, 'checked_at' => Time::iso($source->checked_at)],
            'services' => $this->whenLoaded('services', fn () => $this->services->map(fn (Service $service): array => [
                'slug' => $service->slug,
                'name' => $service->name,
                'category' => $service->category,
                'availability' => $service->pivot->availability_status,
            ])->values()),
            'contacts' => $this->whenLoaded('contacts', fn () => $this->contacts->map(fn (FacilityContact $contact): array => [
                'type' => $contact->contact_type,
                'value' => $contact->value,
            ])->values()),
            'hours' => $this->whenLoaded('hours', fn () => $this->hours->map(fn (FacilityHour $hour): array => [
                'day_of_week' => $hour->day_of_week,
                'opens_at' => substr((string) $hour->opens_at, 0, 5),
                'closes_at' => substr((string) $hour->closes_at, 0, 5),
                'notes' => $hour->notes,
            ])->values()),
            'hour_exceptions' => $this->whenLoaded('hourExceptions', fn () => $this->hourExceptions->map(fn (FacilityHourException $exception): array => [
                'date' => $exception->date->toDateString(),
                'is_closed' => $exception->is_closed,
                'opens_at' => $exception->opens_at === null ? null : substr((string) $exception->opens_at, 0, 5),
                'closes_at' => $exception->closes_at === null ? null : substr((string) $exception->closes_at, 0, 5),
                'reason' => $exception->reason,
            ])->values()),
            'booking_enabled' => $this->when($request->routeIs('v1.facilities.show'), fn (): bool => $this->booking_enabled && app(SettingsRepository::class)->bool('features.booking.enabled')),
            'programs' => $this->whenLoaded('programs', fn () => $this->programs->map(fn (HealthProgram $program): array => [
                'id' => $program->public_id,
                'title' => $program->title,
                'category' => $program->category->label(),
                'starts_on' => $program->starts_on->toDateString(),
                'ends_on' => $program->ends_on?->toDateString(),
            ])->values()),
            'sources' => $this->when($request->routeIs('v1.facilities.show'), fn () => $this->sources->map(fn (FacilitySource $item): array => [
                'name' => $item->source_name,
                'url' => $item->source_url,
                'checked_at' => Time::iso($item->checked_at),
            ])->values()),
        ];
    }

    /** @return array{code: string, name: string}|null */
    private function area(?object $area): ?array
    {
        return $area === null ? null : ['code' => $area->psgc_code, 'name' => $area->name];
    }
}
