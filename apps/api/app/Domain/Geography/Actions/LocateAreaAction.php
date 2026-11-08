<?php

namespace App\Domain\Geography\Actions;

use App\Domain\Geography\Contracts\AreaGeocoder;
use App\Domain\Geography\Models\AreaGeometry;
use App\Domain\Geography\Models\Barangay;
use App\Domain\Geography\Models\CityMunicipality;
use App\Domain\Geography\Models\Province;
use App\Domain\Geography\Models\Region;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Where a PSGC area is on the map. Uses the cached geometry, otherwise asks the
 * geocoder once and caches the answer. If the area itself cannot be found (a small
 * barangay missing from OpenStreetMap), the parent area is shown and marked approximate.
 */
final class LocateAreaAction
{
    public const LEVELS = ['region', 'province', 'city', 'barangay'];

    public function __construct(private readonly AreaGeocoder $geocoder) {}

    /** @return array{area: Model, level: string, geometry: AreaGeometry|null, approximate: bool} */
    public function handle(string $level, string $code): array
    {
        $area = $this->find($level, $code);
        $geometry = $this->geometryFor($level, $area);
        $approximate = false;

        // Walk up to the nearest ancestor that has a position.
        [$parentLevel, $parent] = [$level, $area];
        while (($geometry === null || $geometry->status !== AreaGeometry::FOUND) && ([$parentLevel, $parent] = $this->parentOf($parentLevel, $parent)) !== [null, null]) {
            $geometry = $this->geometryFor($parentLevel, $parent);
            $approximate = true;
        }

        return [
            'area' => $area,
            'level' => $level,
            'geometry' => $geometry?->status === AreaGeometry::FOUND ? $geometry : null,
            'approximate' => $approximate,
        ];
    }

    private function find(string $level, string $code): Model
    {
        $model = match ($level) {
            'region' => Region::class,
            'province' => Province::class,
            'city' => CityMunicipality::class,
            'barangay' => Barangay::class,
            default => throw new ModelNotFoundException,
        };

        return $model::query()->where('psgc_code', $code)->firstOrFail();
    }

    private function geometryFor(string $level, Model $area): ?AreaGeometry
    {
        $cached = AreaGeometry::query()->where('psgc_code', $area->psgc_code)->first();
        $retryAfter = now()->subDays((int) config('communitycare.maps.not_found_retry_days', 30));

        if ($cached !== null && ($cached->status === AreaGeometry::FOUND || $cached->fetched_at->gt($retryAfter))) {
            return $cached;
        }

        try {
            $found = $this->geocoder->locate($this->queries($level, $area));
        } catch (Throwable $exception) {
            Log::warning('Area geocoding failed.', ['psgc_code' => $area->psgc_code, 'error' => $exception->getMessage()]);

            return $cached; // try again next time
        }

        return AreaGeometry::query()->updateOrCreate(['psgc_code' => $area->psgc_code], [
            'level' => $level,
            'status' => $found ? AreaGeometry::FOUND : AreaGeometry::NOT_FOUND,
            'latitude' => $found?->latitude,
            'longitude' => $found?->longitude,
            'bbox' => $found?->bbox,
            'geojson' => $found?->geojson,
            'matched_name' => $found?->matchedName,
            'source' => $this->geocoder->name(),
            'fetched_at' => now(),
        ])->refresh(); // return stored (rounded) values, same as later cache hits
    }

    /**
     * Search phrases, most specific first. PSGC names are adapted to how
     * OpenStreetMap names places ("Region IV-A (CALABARZON)" → "CALABARZON").
     *
     * @return list<string>
     */
    private function queries(string $level, Model $area): array
    {
        $chain = [];
        [$currentLevel, $current] = [$level, $area];
        while ($current !== null) {
            $chain[] = $this->searchName($currentLevel, $current);
            [$currentLevel, $current] = $this->parentOf($currentLevel, $current);
        }

        $chain = array_values(array_filter($chain));
        $suffix = ', Philippines';

        // Most specific first; then looser phrases, because independent cities (Iligan,
        // Cagayan de Oro…) lie outside their province's boundary on OpenStreetMap.
        return array_values(array_unique(array_filter([
            implode(', ', $chain).$suffix,
            count($chain) > 2 ? $chain[0].', '.$chain[1].$suffix : null,
            count($chain) > 1 ? $chain[0].', '.$chain[count($chain) - 1].$suffix : null,
            $level === 'city' ? $chain[0].$suffix : null,
            // PSGC "City of Cagayan De Oro" is "Cagayan de Oro" on OpenStreetMap.
            $level === 'city' && str_starts_with($chain[0], 'City of ') ? substr($chain[0], 8).$suffix : null,
        ])));
    }

    private function searchName(string $level, Model $area): ?string
    {
        $name = (string) $area->name;

        if ($level === 'region') {
            if (str_contains($name, 'National Capital Region')) {
                return 'Metro Manila';
            }

            return preg_match('/\(([^)]+)\)/', $name, $m) === 1 ? $m[1] : $name;
        }

        // NCR "districts" are statistical groupings, not places on a map.
        if ($level === 'province' && $area->is_district) {
            return null;
        }

        return $name;
    }

    /** @return array{0: string|null, 1: Model|null} */
    private function parentOf(string $level, Model $area): array
    {
        return match ($level) {
            'barangay' => ['city', $area->cityMunicipality],
            'city' => match (true) {
                $area->province !== null => ['province', $area->province],
                $area->geographicProvince !== null => ['province', $area->geographicProvince],
                default => ['region', $area->region],
            },
            'province' => ['region', $area->region],
            default => [null, null],
        };
    }
}
