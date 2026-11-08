<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Domain\Geography\Models\Barangay;
use App\Domain\Geography\Models\CityMunicipality;
use App\Domain\Geography\Models\Province;
use App\Domain\Geography\Models\Region;
use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Public PSGC lists used by directory filters. */
final class LocationController extends Controller
{
    public function regions(): JsonResponse
    {
        return $this->list(Region::query()->orderBy('psgc_code')->get(['psgc_code', 'name']));
    }

    public function provinces(Request $request): JsonResponse
    {
        $request->validate(['region_code' => ['required', 'digits:10']]);

        return $this->list(Province::query()
            ->whereHas('region', fn (Builder $q) => $q->where('psgc_code', $request->string('region_code')->toString()))
            ->orderBy('name')
            ->get(['psgc_code', 'name', 'is_district']));
    }

    public function cities(Request $request): JsonResponse
    {
        $request->validate([
            'province_code' => ['required_without:region_code', 'nullable', 'digits:10'],
            'region_code' => ['required_without:province_code', 'nullable', 'digits:10'],
        ]);

        $query = CityMunicipality::query();

        if ($request->filled('province_code')) {
            $query->whereHas('province', fn (Builder $q) => $q->where('psgc_code', $request->string('province_code')->toString()));
        } else {
            $query->whereHas('region', fn (Builder $q) => $q->where('psgc_code', $request->string('region_code')->toString()));
        }

        return $this->list($query->orderBy('name')->get(['psgc_code', 'name', 'kind']));
    }

    public function barangays(Request $request): JsonResponse
    {
        $request->validate(['city_code' => ['required', 'digits:10']]);

        return $this->list(Barangay::query()
            ->whereHas('cityMunicipality', fn (Builder $q) => $q->where('psgc_code', $request->string('city_code')->toString()))
            ->orderBy('name')
            ->get(['psgc_code', 'name']));
    }

    /** @param iterable<Model> $areas */
    private function list(iterable $areas): JsonResponse
    {
        $data = [];
        foreach ($areas as $area) {
            $row = $area->toArray();
            $row['code'] = $row['psgc_code'];
            unset($row['psgc_code']);
            $data[] = $row;
        }

        return response()->json(['data' => $data]);
    }
}
