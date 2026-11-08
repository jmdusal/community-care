<?php

namespace App\Domain\Facilities\Data;

final readonly class FacilitySearchData
{
    public function __construct(
        public ?string $query = null,
        public ?string $regionCode = null,
        public ?string $provinceCode = null,
        public ?string $cityCode = null,
        public ?string $barangayCode = null,
        public ?string $type = null,
        public ?string $service = null,
        public ?float $latitude = null,
        public ?float $longitude = null,
        public float $radiusKm = 10,
        public bool $verifiedOnly = false,
        public int $page = 1,
        public int $perPage = 20,
    ) {}

    public function isNearby(): bool
    {
        return $this->latitude !== null && $this->longitude !== null;
    }
}
