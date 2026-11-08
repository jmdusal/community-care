<?php

namespace App\Domain\Geography\Geocoders;

use App\Domain\Geography\Contracts\AreaGeocoder;
use App\Domain\Geography\Data\GeocodedArea;
use App\Domain\Geography\Support\Distance;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * OpenStreetMap Nominatim: free, no API key. Follows its usage policy: an
 * identifying User-Agent and at most one request per second (shared lock).
 * Results are cached by the caller, so each area is looked up once.
 */
final class NominatimGeocoder implements AreaGeocoder
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly string $userAgent,
        private readonly int $minIntervalMs = 1100,
    ) {}

    public function name(): string
    {
        return 'nominatim';
    }

    public function locate(array $queries): ?GeocodedArea
    {
        foreach ($queries as $query) {
            $result = $this->search($query);

            if ($result !== null) {
                return $result;
            }
        }

        return null;
    }

    private function search(string $query): ?GeocodedArea
    {
        $this->throttle();

        $results = Http::baseUrl(rtrim($this->baseUrl, '/'))
            ->withUserAgent($this->userAgent)
            ->acceptJson()
            ->timeout(15)
            ->get('/search', [
                'q' => $query,
                'format' => 'jsonv2',
                'countrycodes' => 'ph',
                'limit' => 5,
                'polygon_geojson' => 1,
                'polygon_threshold' => 0.002,
            ])
            ->throw()
            ->json() ?? [];

        // Prefer administrative boundaries over buildings or roads with similar names.
        usort($results, fn (array $a, array $b): int => $this->rank($b) <=> $this->rank($a));
        $best = $results[0] ?? null;

        if ($best === null || $this->rank($best) === 0) {
            return null;
        }

        $lat = (float) $best['lat'];
        $lng = (float) $best['lon'];
        [$south, $north, $west, $east] = array_map('floatval', $best['boundingbox']);

        if (! Distance::isInPhilippines($lat, $lng)) {
            return null;
        }

        $geojson = $best['geojson'] ?? null;

        return new GeocodedArea(
            latitude: $lat,
            longitude: $lng,
            bbox: [$south, $west, $north, $east],
            geojson: is_array($geojson) && in_array($geojson['type'] ?? null, ['Polygon', 'MultiPolygon'], true) ? $geojson : null,
            matchedName: (string) ($best['display_name'] ?? $query),
        );
    }

    /** @param array<string, mixed> $result */
    private function rank(array $result): int
    {
        return match (true) {
            ($result['category'] ?? null) === 'boundary' && ($result['type'] ?? null) === 'administrative' => 3,
            ($result['category'] ?? null) === 'place' => 2,
            ($result['category'] ?? null) === 'boundary' => 1,
            default => 0,
        };
    }

    /** One request per ~1.1 s across all PHP processes. */
    private function throttle(): void
    {
        Cache::lock('geocoder:nominatim', 10)->block(10, function (): void {
            $last = (int) Cache::get('geocoder:nominatim:last', 0);
            $wait = $this->minIntervalMs - ((int) (microtime(true) * 1000) - $last);

            if ($wait > 0) {
                usleep($wait * 1000);
            }

            Cache::put('geocoder:nominatim:last', (int) (microtime(true) * 1000), 60);
        });
    }
}
