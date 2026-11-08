<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Geography\Models\Barangay;
use App\Domain\Geography\Models\CityMunicipality;
use App\Domain\Geography\Models\Province;
use App\Domain\Geography\Models\Region;
use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Facility coverage per PSGC area, one level at a time, for the Locations screen.
 * GET /admin/locations/coverage?level=province&parent_code=0400000000
 */
final class LocationCoverageController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        Gate::authorize('view-admin');

        $input = $request->validate([
            'level' => ['required', Rule::in(['region', 'province', 'city', 'barangay'])],
            'parent_code' => ['required_unless:level,region', 'nullable', 'digits:10'],
        ]);

        $parent = $input['parent_code'] ?? null;

        $query = match ($input['level']) {
            'region' => Region::query(),
            'province' => Province::query()->whereHas('region', fn (Builder $q) => $q->where('psgc_code', $parent)),
            'city' => CityMunicipality::query()->where(fn (Builder $q) => $q
                ->whereHas('province', fn (Builder $p) => $p->where('psgc_code', $parent))
                // Independent cities (Iligan, Cagayan de Oro…) under the province they sit in.
                ->orWhereHas('geographicProvince', fn (Builder $p) => $p->where('psgc_code', $parent))
                // Parent is a region: its cities that belong to no province (NCR, or independent cities without a geographic link).
                ->orWhere(fn (Builder $q) => $q->whereNull('province_id')->whereNull('geographic_province_id')->whereHas('region', fn (Builder $r) => $r->where('psgc_code', $parent)))),
            'barangay' => Barangay::query()->whereHas('cityMunicipality', fn (Builder $q) => $q->where('psgc_code', $parent)),
        };

        $areas = $query
            ->withCount([
                'facilities',
                'facilities as verified_count' => fn (Builder $q) => $q->where('verification_status', VerificationStatus::Verified),
                'facilities as missing_coordinates_count' => fn (Builder $q) => $q->whereNull('latitude'),
            ])
            ->orderBy('psgc_code')
            ->get();

        $rows = $areas->map(fn (Model $area): array => [
            'code' => $area->psgc_code,
            'name' => $area->name,
            'kind' => $area->kind ?? null,
            'is_district' => $area->is_district ?? null,
            'independent' => $area instanceof CityMunicipality ? $area->province_id === null && $area->geographic_province_id !== null : false,
            'facilities' => $area->facilities_count,
            'verified' => $area->verified_count,
            'missing_coordinates' => $area->missing_coordinates_count,
        ])->values();

        if ($input['level'] === 'province' && $rows->isNotEmpty()) {
            $rows = $rows->concat($this->unplacedIndependentCities($parent));
        }

        return response()->json([
            'data' => $rows->values(),
            'meta' => ['level' => $input['level'], 'parent_code' => $parent],
        ]);
    }

    /**
     * Cities in a region that belong to no province and have no geographic province
     * (for example after a PSA CSV import) appear as one "Independent cities" entry, so
     * they are never hidden. Selecting it lists the region's province-less cities.
     *
     * @return list<array<string, mixed>>
     */
    private function unplacedIndependentCities(?string $regionCode): array
    {
        $cities = CityMunicipality::query()
            ->whereNull('province_id')
            ->whereNull('geographic_province_id')
            ->whereHas('region', fn (Builder $r) => $r->where('psgc_code', $regionCode))
            ->withCount(['facilities', 'facilities as verified_count' => fn (Builder $q) => $q->where('verification_status', VerificationStatus::Verified), 'facilities as missing_coordinates_count' => fn (Builder $q) => $q->whereNull('latitude')])
            ->get();

        if ($cities->isEmpty()) {
            return [];
        }

        return [[
            'code' => $regionCode,
            'name' => 'Independent cities',
            'kind' => 'independent_cities',
            'is_district' => false,
            'independent' => false,
            'facilities' => (int) $cities->sum('facilities_count'),
            'verified' => (int) $cities->sum('verified_count'),
            'missing_coordinates' => (int) $cities->sum('missing_coordinates_count'),
        ]];
    }
}
