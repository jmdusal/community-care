<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Models\FacilityType;
use App\Domain\Services\Models\Service;
use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Service and facility-type catalogs for directory filters and facility forms, with
 * published-facility counts. Archived items are left out unless ?with_archived=1 (the
 * admin form uses it to show the names of archived items a facility still lists).
 */
final class CatalogController extends Controller
{
    public function services(Request $request): JsonResponse
    {
        $services = Service::query()
            ->unless($request->boolean('with_archived'), fn (Builder $q) => $q->active())
            ->withCount(['facilities' => fn (Builder $q) => $q->where('publication_status', PublicationStatus::Published)])
            ->orderBy('category')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $services->map(fn (Service $service): array => [
            'slug' => $service->slug,
            'name' => $service->name,
            'category' => $service->category,
            'facilities' => $service->facilities_count,
            'archived' => $service->archived_at !== null,
        ])->values()]);
    }

    public function facilityTypes(Request $request): JsonResponse
    {
        $types = FacilityType::query()
            ->unless($request->boolean('with_archived'), fn (Builder $q) => $q->active())
            ->withCount(['facilities' => fn (Builder $q) => $q->where('publication_status', PublicationStatus::Published)])
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $types->map(fn (FacilityType $type): array => [
            'slug' => $type->slug,
            'name' => $type->name,
            'facilities' => $type->facilities_count,
            'archived' => $type->archived_at !== null,
        ])->values()]);
    }
}
