<?php

namespace App\Domain\Geography\Data;

final readonly class GeocodedArea
{
    /**
     * @param  array{0: float, 1: float, 2: float, 3: float}  $bbox  south, west, north, east
     * @param  array<string, mixed>|null  $geojson  boundary (Polygon / MultiPolygon), if known
     */
    public function __construct(
        public float $latitude,
        public float $longitude,
        public array $bbox,
        public ?array $geojson,
        public string $matchedName,
    ) {}
}
