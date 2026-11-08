<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Domain\Analytics\Actions\RecordUsageEventAction;
use App\Domain\Analytics\Models\UsageEvent;
use App\Domain\Facilities\Contracts\FacilityReader;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Support\TodayStatus;
use App\Domain\Geography\Models\Region;
use App\Http\Controllers\Controller;
use App\Http\Requests\Public\SearchFacilitiesRequest;
use App\Http\Resources\FacilityResource;
use App\Http\Support\Paginated;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class FacilityController extends Controller
{
    public function __construct(
        private readonly FacilityReader $facilities,
        private readonly RecordUsageEventAction $recordUsage,
    ) {}

    public function index(SearchFacilitiesRequest $request): JsonResponse
    {
        $search = $request->toData();
        $results = $this->facilities->search($search);

        $regionId = $search->regionCode === null ? null : Region::query()->where('psgc_code', $search->regionCode)->value('id');
        $this->recordUsage->handle($request, UsageEvent::SEARCH, regionId: $regionId, query: $search->query, resultCount: $results->total());

        return Paginated::response($results, FacilityResource::class, $request);
    }

    public function show(Request $request, string $facility): JsonResponse
    {
        $found = $this->findOrFail($facility);
        $this->recordUsage->handle($request, UsageEvent::PROFILE_VIEW, facilityId: $found->id, regionId: $found->region_id);

        // Current health programs this facility takes part in (phase 7), and what staff said today.
        $resource = new FacilityResource($found->load(['programs' => fn ($q) => $q->current()->orderBy('starts_on')]));

        return response()->json(['data' => [...$resource->resolve($request), 'today' => TodayStatus::present(TodayStatus::find($found))]]);
    }

    public function services(string $facility): JsonResponse
    {
        return response()->json(['data' => (new FacilityResource($this->findOrFail($facility)))->resolve()['services']]);
    }

    public function hours(string $facility): JsonResponse
    {
        $resolved = (new FacilityResource($this->findOrFail($facility)))->resolve();

        return response()->json(['data' => ['regular' => $resolved['hours'], 'exceptions' => $resolved['hour_exceptions']]]);
    }

    /** Anonymous call/directions clicks from the facility page (success measures). */
    public function event(Request $request, string $facility): Response
    {
        $input = $request->validate(['event' => ['required', Rule::in(UsageEvent::PUBLIC_EVENTS)]]);
        $found = $this->findOrFail($facility);

        $this->recordUsage->handle($request, $input['event'], facilityId: $found->id, regionId: $found->region_id);

        return response()->noContent();
    }

    private function findOrFail(string $publicId): Facility
    {
        return $this->facilities->findPublished($publicId) ?? throw new NotFoundHttpException;
    }
}
