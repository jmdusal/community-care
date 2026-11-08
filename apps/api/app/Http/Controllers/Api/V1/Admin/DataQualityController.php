<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Facilities\Queries\DataQualityQuery;
use App\Http\Controllers\Controller;
use App\Http\Support\ConsoleScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/** GET /admin/data-quality: issues per facility, following the top-bar scope. Staff see their facilities only. */
final class DataQualityController extends Controller
{
    public function __invoke(Request $request, DataQualityQuery $quality): JsonResponse
    {
        Gate::authorize('view-admin');
        $user = $request->user();

        $filters = $request->validate([
            'facility_id' => ConsoleScope::FACILITY_RULE,
            'region_code' => ['nullable', 'digits:10'],
        ]);

        $report = $quality->handle(fn (Builder $q) => $q
            ->unless($user->seesAllFacilities(), fn (Builder $q) => $q->whereHas('staff', fn (Builder $s) => $s->whereKey($user->id)))
            ->when(ConsoleScope::facilityIds($filters['facility_id'] ?? null), fn (Builder $q, array $ids) => $q->whereIn('public_id', $ids))
            ->when($filters['region_code'] ?? null, fn (Builder $q, string $code) => $q->whereHas('region', fn (Builder $r) => $r->where('psgc_code', $code))));

        return response()->json(['data' => $report]);
    }
}
