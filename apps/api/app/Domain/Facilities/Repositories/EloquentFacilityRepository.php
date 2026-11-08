<?php

namespace App\Domain\Facilities\Repositories;

use App\Domain\DataImports\Data\FacilityRecordData;
use App\Domain\Facilities\Contracts\FacilityWriter;
use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilitySource;
use App\Domain\Facilities\Models\FacilityType;
use App\Domain\Facilities\Support\FacilitySnapshot;
use App\Domain\Geography\Support\GeographyLookup;
use App\Domain\Services\Models\Service;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class EloquentFacilityRepository implements FacilityWriter
{
    public function __construct(private readonly GeographyLookup $geography) {}

    public function applyImportedRecord(FacilityRecordData $record, string $sourceName, ?int $facilityId, ?int $actorId): Facility
    {
        $facility = $facilityId !== null ? Facility::query()->findOrFail($facilityId) : new Facility;
        $city = $this->geography->cityContext($record->cityCode);

        $facility->fill([
            'name' => $record->name,
            'facility_type_id' => $this->typeId($record->typeName) ?? $facility->facility_type_id,
            'address' => $record->address ?? $facility->address,
            'region_id' => $this->geography->regionId($record->regionCode) ?? $city['region_id'] ?? $facility->region_id,
            'province_id' => $this->geography->provinceId($record->provinceCode) ?? $city['province_id'] ?? $facility->province_id,
            'city_municipality_id' => $city['id'] ?? $facility->city_municipality_id,
            'barangay_id' => $this->geography->barangayId($record->barangayCode) ?? $facility->barangay_id,
            'latitude' => $record->latitude ?? $facility->latitude,
            'longitude' => $record->longitude ?? $facility->longitude,
            'verification_status' => VerificationStatus::Verified,
            'verified_at' => now(),
            'verified_by' => $actorId,
            'verification_method' => "import:{$sourceName}",
        ]);

        if (! $facility->exists || $facility->publication_status === PublicationStatus::Unpublished) {
            $facility->publication_status = PublicationStatus::Published;
        }

        $facility->save();

        if ($record->hasCoordinates()) {
            $this->setLocation($facility, (float) $record->latitude, (float) $record->longitude);
        }

        if ($record->contacts !== []) {
            $facility->contacts()->delete();
            $facility->contacts()->createMany(array_map(
                fn (array $contact): array => ['contact_type' => $contact['type'], 'value' => $contact['value'], 'is_public' => true],
                $record->contacts,
            ));
        }

        $this->attachServices($facility, $record->services, $sourceName);

        if ($record->sourceRecordId !== null) {
            FacilitySource::query()->updateOrCreate(
                ['source_name' => $sourceName, 'source_record_id' => $record->sourceRecordId],
                ['facility_id' => $facility->id, 'payload_hash' => $record->hash(), 'checked_at' => now(), 'imported_at' => now()],
            );
        }

        return $facility;
    }

    public function applyReviewedChanges(Facility $facility, array $after, int $reviewerId): Facility
    {
        $attributes = array_intersect_key($after, array_flip(['name', 'address', 'latitude', 'longitude']));

        if (array_key_exists('type', $after)) {
            $attributes['facility_type_id'] = $after['type'] === null ? null : FacilityType::query()->where('slug', $after['type'])->value('id');
        }

        if (array_key_exists('city_code', $after)) {
            $city = $this->geography->cityContext($after['city_code']);
            $attributes['city_municipality_id'] = $city['id'] ?? null;
            $attributes['region_id'] = $city['region_id'] ?? $facility->region_id;
            $attributes['province_id'] = $city['province_id'] ?? null;
        }

        if (array_key_exists('barangay_code', $after)) {
            $attributes['barangay_id'] = $this->geography->barangayId($after['barangay_code']);
        }

        $facility->fill([
            ...$attributes,
            'verification_status' => VerificationStatus::Verified,
            'verified_at' => now(),
            'verified_by' => $reviewerId,
            'verification_method' => 'review',
        ])->save();

        if ($facility->latitude !== null && $facility->longitude !== null && (array_key_exists('latitude', $after) || array_key_exists('longitude', $after))) {
            $this->setLocation($facility, (float) $facility->latitude, (float) $facility->longitude);
        } elseif (array_key_exists('latitude', $after) && $after['latitude'] === null) {
            DB::table('facility_locations')->where('facility_id', $facility->id)->delete();
        }

        if (array_key_exists('contacts', $after)) {
            $facility->contacts()->delete();
            $facility->contacts()->createMany(array_map(fn (array $contact): array => ['contact_type' => $contact['type'], 'value' => $contact['value'], 'is_public' => true], $after['contacts']));
        }

        if (array_key_exists('hours', $after)) {
            $facility->hours()->delete();
            $facility->hours()->createMany($after['hours']);
        }

        if (array_key_exists('hour_exceptions', $after)) {
            // Replace today and later; earlier special days stay as history.
            $facility->hourExceptions()->whereDate('date', '>=', FacilitySnapshot::today())->delete();
            $facility->hourExceptions()->createMany($after['hour_exceptions']);
        }

        if (array_key_exists('services', $after)) {
            $ids = Service::query()->whereIn('slug', $after['services'])->pluck('id');
            $facility->services()->sync($ids->mapWithKeys(fn (int $id): array => [$id => ['availability_status' => 'listed', 'source_name' => 'review', 'verified_at' => now()]])->all());
        }

        return $facility->refresh();
    }

    public function touchSource(string $sourceName, string $sourceRecordId): void
    {
        FacilitySource::query()
            ->where('source_name', $sourceName)
            ->where('source_record_id', $sourceRecordId)
            ->update(['checked_at' => now()]);
    }

    /**
     * MySQL treats SRID 4326 as latitude-longitude; the WKT here is written
     * longitude-latitude, so the axis order is stated explicitly.
     */
    public function setLocation(Facility $facility, float $latitude, float $longitude): void
    {
        DB::statement(
            'INSERT INTO facility_locations (facility_id, location)
             VALUES (?, ST_GeomFromText(?, 4326, \'axis-order=long-lat\')) AS new
             ON DUPLICATE KEY UPDATE location = new.location',
            [$facility->id, sprintf('POINT(%.6F %.6F)', $longitude, $latitude)],
        );
    }

    private function typeId(?string $typeName): ?int
    {
        if ($typeName === null) {
            return null;
        }

        return FacilityType::query()->firstOrCreate(['slug' => Str::slug($typeName)], ['name' => $typeName])->id;
    }

    /** @param list<string> $names */
    private function attachServices(Facility $facility, array $names, string $sourceName): void
    {
        $pivot = [];
        foreach ($names as $name) {
            $service = Service::query()->firstOrCreate(['slug' => Str::slug($name)], ['name' => $name, 'category' => 'general']);
            $pivot[$service->id] = ['availability_status' => 'listed', 'source_name' => $sourceName, 'verified_at' => now()];
        }

        if ($pivot !== []) {
            $facility->services()->syncWithoutDetaching($pivot);
        }
    }
}
