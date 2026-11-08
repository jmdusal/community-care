<?php

namespace App\Http\Resources;

use App\Domain\Facilities\Models\Facility;
use App\Domain\HealthPrograms\Models\HealthProgram;
use App\Http\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin HealthProgram */
final class HealthProgramResource extends JsonResource
{
    /** Admin views include drafts, editors and every linked facility. */
    public bool $admin = false;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->public_id,
            'title' => $this->title,
            'category' => ['value' => $this->category->value, 'label' => $this->category->label()],
            'summary' => $this->summary,
            'description' => $this->description,
            'starts_on' => $this->starts_on->toDateString(),
            'ends_on' => $this->ends_on?->toDateString(),
            'source' => $this->source_name === null ? null : ['name' => $this->source_name, 'url' => $this->source_url],
            'status' => $this->when($this->admin, $this->status->value),
            'published_at' => $this->when($this->admin, fn () => Time::iso($this->published_at)),
            'updated_at' => $this->when($this->admin, fn () => Time::iso($this->updated_at)),
            'facility_count' => $this->whenCounted('facilities'),
            'facilities' => $this->whenLoaded('facilities', fn () => $this->facilities
                ->filter(fn (Facility $facility): bool => $this->admin || $facility->publication_status->value === 'published')
                ->map(fn (Facility $facility): array => [
                    'id' => $facility->public_id,
                    'name' => $facility->name,
                    'city' => $facility->cityMunicipality?->name,
                    'region' => $facility->region?->name,
                ])->values()),
        ];
    }
}
