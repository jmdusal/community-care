<?php

namespace App\Domain\DataImports\Data;

/**
 * One facility row, normalized by an adapter. This is the only shape the
 * pipeline understands, whatever file format the source uses.
 */
final readonly class FacilityRecordData
{
    /**
     * @param  list<array{type: string, value: string}>  $contacts
     * @param  list<string>  $services
     */
    public function __construct(
        public int $rowNumber,
        public ?string $sourceRecordId,
        public ?string $name,
        public ?string $typeName = null,
        public ?string $address = null,
        public ?string $regionCode = null,
        public ?string $provinceCode = null,
        public ?string $cityCode = null,
        public ?string $barangayCode = null,
        public ?float $latitude = null,
        public ?float $longitude = null,
        public array $contacts = [],
        public array $services = [],
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'row_number' => $this->rowNumber,
            'source_record_id' => $this->sourceRecordId,
            'name' => $this->name,
            'type' => $this->typeName,
            'address' => $this->address,
            'region_code' => $this->regionCode,
            'province_code' => $this->provinceCode,
            'city_code' => $this->cityCode,
            'barangay_code' => $this->barangayCode,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'contacts' => $this->contacts,
            'services' => $this->services,
        ];
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            rowNumber: (int) ($data['row_number'] ?? 0),
            sourceRecordId: $data['source_record_id'] ?? null,
            name: $data['name'] ?? null,
            typeName: $data['type'] ?? null,
            address: $data['address'] ?? null,
            regionCode: $data['region_code'] ?? null,
            provinceCode: $data['province_code'] ?? null,
            cityCode: $data['city_code'] ?? null,
            barangayCode: $data['barangay_code'] ?? null,
            latitude: isset($data['latitude']) ? (float) $data['latitude'] : null,
            longitude: isset($data['longitude']) ? (float) $data['longitude'] : null,
            contacts: $data['contacts'] ?? [],
            services: $data['services'] ?? [],
        );
    }

    /** Coordinates removed (used when they fail validation). */
    public function withoutCoordinates(): self
    {
        return self::fromArray([...$this->toArray(), 'latitude' => null, 'longitude' => null]);
    }

    /** Fingerprint of everything a source can change; equal hash = unchanged record. */
    public function hash(): string
    {
        $data = $this->toArray();
        unset($data['row_number']);

        return hash('sha256', (string) json_encode($data));
    }

    public function hasCoordinates(): bool
    {
        return $this->latitude !== null && $this->longitude !== null;
    }
}
