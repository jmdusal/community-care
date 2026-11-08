<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Analytics\Queries\DashboardStatsQuery;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Geography\Models\Region;
use App\Http\Controllers\Controller;
use App\Http\Support\ConsoleScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * GET /admin/stats?facility_id=id1,id2&region_code=&days=30
 * The scope is checked on the server: facility staff may only ask for a
 * facility assigned to them (docs/roles-and-permissions.md, facility scope).
 */
final class StatsController extends Controller
{
    public function __invoke(Request $request, DashboardStatsQuery $stats): JsonResponse
    {
        Gate::authorize('view-admin');
        $input = $request->validate([
            'facility_id' => ConsoleScope::FACILITY_RULE,
            'region_code' => ['nullable', 'digits:10'],
            'days' => ['nullable', Rule::in(['7', '30', '90'])],
        ]);

        $user = $request->user();
        $ids = ConsoleScope::facilityIds($input['facility_id'] ?? null);
        $region = isset($input['region_code']) ? Region::query()->where('psgc_code', $input['region_code'])->firstOrFail() : null;

        if ($ids !== null) {
            $facilities = Facility::query()->whereIn('public_id', $ids)->get();
            abort_if($facilities->count() !== count($ids), 404);
            $facilities->each(fn (Facility $facility) => Gate::authorize('view', $facility));
        } elseif (! $user->seesAllFacilities()) {
            // Nothing chosen: all of this person's assigned facilities (none assigned: nothing to show).
            $facilities = $user->facilities()->get();
            abort_if($facilities->isEmpty(), 403, 'You are not assigned to a facility yet. Ask an administrator.');
        } else {
            $facilities = null;
        }

        $days = (int) ($input['days'] ?? 30);
        $key = 'admin-stats:'.($facilities === null ? '-' : md5($facilities->pluck('id')->sort()->implode(','))).':'.($region->id ?? '-').":{$days}";

        return response()->json(['data' => Cache::remember($key, 60, fn () => $stats->handle($facilities, $region, $days))]);
    }
}
