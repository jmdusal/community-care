<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Geography\Actions\LocateAreaAction;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * GET /admin/locations/map?level=city&code=0405802000
 * The area's position and boundary (OpenStreetMap, cached) and its facilities with coordinates.
 */
final class AreaMapController extends Controller
{
    private const MAX_FACILITIES = 1000;

    private const AREA_COLUMNS = [
        'region' => 'region_id',
        'province' => 'province_id',
        'city' => 'city_municipality_id',
        'barangay' => 'barangay_id',
    ];

    public function __invoke(Request $request, LocateAreaAction $locate): JsonResponse
    {
        Gate::authorize('view-admin');

        $input = $request->validate([
            'level' => ['required', Rule::in(LocateAreaAction::LEVELS)],
            'code' => ['required', 'digits:10'],
        ]);

        ['area' => $area, 'geometry' => $geometry, 'approximate' => $approximate] = $locate->handle($input['level'], $input['code']);

        $facilities = Facility::query()
            ->where(self::AREA_COLUMNS[$input['level']], $area->id)
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->unless($request->user()->seesAllFacilities(), fn ($q) => $q->whereHas('staff', fn ($s) => $s->whereKey($request->user()->id)))
            ->orderBy('name')
            ->limit(self::MAX_FACILITIES)
            ->get(['id', 'public_id', 'name', 'latitude', 'longitude', 'verification_status', 'publication_status']);

        return response()->json(['data' => [
            'area' => ['code' => $area->psgc_code, 'name' => $area->name, 'level' => $input['level']],
            'map' => $geometry === null ? null : [
                'center' => ['lat' => $geometry->latitude, 'lng' => $geometry->longitude],
                'bbox' => $geometry->bbox,
                'boundary' => $approximate ? null : $geometry->geojson,
                'approximate' => $approximate,
                'source' => 'OpenStreetMap',
            ],
            'facilities' => $facilities->map(fn (Facility $facility): array => [
                'id' => $facility->public_id,
                'name' => $facility->name,
                'lat' => (float) $facility->latitude,
                'lng' => (float) $facility->longitude,
                'verification_status' => $facility->verification_status->value,
                'published' => $facility->publication_status->value === 'published',
            ])->values(),
        ]]);
    }
}
