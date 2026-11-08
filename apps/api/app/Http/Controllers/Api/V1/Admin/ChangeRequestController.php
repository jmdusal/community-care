<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\DataImports\Enums\ImportBatchStatus;
use App\Domain\DataImports\Enums\StagingDecision;
use App\Domain\DataImports\Models\ImportStagingRecord;
use App\Domain\Facilities\Actions\ApproveChangeRequestAction;
use App\Domain\Facilities\Actions\RejectChangeRequestAction;
use App\Domain\Facilities\Actions\WithdrawChangeRequestAction;
use App\Domain\Facilities\Enums\ChangeRequestStatus;
use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityChangeRequest;
use App\Http\Controllers\Controller;
use App\Http\Resources\ChangeRequestResource;
use App\Http\Support\ConsoleScope;
use App\Http\Support\Paginated;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/** The review queue: proposals waiting for a second person, plus related counts. */
final class ChangeRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Facility::class);
        $user = $request->user();

        $filters = $request->validate([
            'status' => ['nullable', Rule::enum(ChangeRequestStatus::class)],
            'facility_id' => ConsoleScope::FACILITY_RULE,
            'region_code' => ['nullable', 'digits:10'],
        ]);

        $requests = FacilityChangeRequest::query()
            ->with(['facility', 'submitter:id,name', 'reviewer:id,name'])
            ->where('status', $filters['status'] ?? ChangeRequestStatus::Submitted->value)
            ->unless($user->seesAllFacilities(), fn (Builder $q) => $q->where(fn (Builder $w) => $w
                ->where('submitted_by', $user->id)
                ->orWhereHas('facility.staff', fn (Builder $s) => $s->whereKey($user->id))))
            ->when(ConsoleScope::facilityIds($filters['facility_id'] ?? null), fn (Builder $q, array $ids) => $q->whereHas('facility', fn (Builder $f) => $f->whereIn('public_id', $ids)))
            ->when($filters['region_code'] ?? null, fn (Builder $q, string $code) => $q->whereHas('facility.region', fn (Builder $r) => $r->where('psgc_code', $code)))
            ->oldest('id')
            ->paginate(Paginated::perPage($request));

        $inScope = fn (Builder $q) => $q
            ->when(ConsoleScope::facilityIds($filters['facility_id'] ?? null), fn (Builder $q, array $ids) => $q->whereIn('public_id', $ids))
            ->when($filters['region_code'] ?? null, fn (Builder $q, string $code) => $q->whereHas('region', fn (Builder $r) => $r->where('psgc_code', $code)));

        $meta = $user->seesAllFacilities() ? [
            'queue' => [
                // Follow the top-bar scope like the list does. Flagged import records belong to no facility yet.
                'pending_changes' => FacilityChangeRequest::query()->where('status', ChangeRequestStatus::Submitted)->whereHas('facility', $inScope)->count(),
                'stale_facilities' => Facility::query()->where('verification_status', VerificationStatus::Stale)->tap($inScope)->count(),
                'flagged_import_records' => ImportStagingRecord::query()
                    ->where('is_flagged', true)
                    ->where('decision', StagingDecision::Pending)
                    ->whereHas('batch', fn (Builder $b) => $b->where('status', ImportBatchStatus::NeedsReview))
                    ->count(),
            ],
        ] : [];

        return Paginated::response($requests, ChangeRequestResource::class, $request, $meta);
    }

    public function show(FacilityChangeRequest $changeRequest): ChangeRequestResource
    {
        Gate::authorize('view', $changeRequest);

        return new ChangeRequestResource($changeRequest->load(['facility', 'submitter:id,name', 'reviewer:id,name']));
    }

    public function approve(Request $request, FacilityChangeRequest $changeRequest, ApproveChangeRequestAction $approve): ChangeRequestResource
    {
        Gate::authorize('review', $changeRequest);

        return new ChangeRequestResource($approve->handle($changeRequest, $request->user())->load(['facility', 'submitter:id,name', 'reviewer:id,name']));
    }

    public function reject(Request $request, FacilityChangeRequest $changeRequest, RejectChangeRequestAction $reject): ChangeRequestResource
    {
        Gate::authorize('review', $changeRequest);
        $input = $request->validate(['reason' => ['required', 'string', 'max:500']]);

        return new ChangeRequestResource($reject->handle($changeRequest, $request->user(), $input['reason'])->load(['facility', 'submitter:id,name', 'reviewer:id,name']));
    }

    public function withdraw(Request $request, FacilityChangeRequest $changeRequest, WithdrawChangeRequestAction $withdraw): ChangeRequestResource
    {
        Gate::authorize('withdraw', $changeRequest);

        return new ChangeRequestResource($withdraw->handle($changeRequest, $request->user())->load(['facility', 'submitter:id,name']));
    }
}
