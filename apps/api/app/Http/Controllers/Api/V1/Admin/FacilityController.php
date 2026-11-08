<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Facilities\Actions\ApproveChangeRequestAction;
use App\Domain\Facilities\Actions\CreateFacilityAction;
use App\Domain\Facilities\Actions\ProposeFacilityChangeAction;
use App\Domain\Facilities\Actions\ReverifyFacilityAction;
use App\Domain\Facilities\Actions\SetPublicationAction;
use App\Domain\Facilities\Enums\ChangeRequestStatus;
use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityChangeRequest;
use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Models\User;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProposeFacilityRequest;
use App\Http\Requests\Admin\StoreFacilityRequest;
use App\Http\Resources\AdminFacilityResource;
use App\Http\Resources\ChangeRequestResource;
use App\Http\Support\ConsoleScope;
use App\Http\Support\Paginated;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

final class FacilityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Facility::class);
        $user = $request->user();

        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'verification_status' => ['nullable', Rule::enum(VerificationStatus::class)],
            'publication_status' => ['nullable', Rule::enum(PublicationStatus::class)],
            'region_code' => ['nullable', 'digits:10'],
            'facility_id' => ConsoleScope::FACILITY_RULE,
        ]);

        // The dashboard scope (one facility or one region) applies to the list and to the tab counts.
        $scoped = fn (Builder $q) => $q
            ->unless($user->seesAllFacilities(), fn (Builder $q) => $q->whereHas('staff', fn (Builder $s) => $s->whereKey($user->id)))
            ->when(ConsoleScope::facilityIds($filters['facility_id'] ?? null), fn (Builder $q, array $ids) => $q->whereIn('public_id', $ids))
            ->when($filters['region_code'] ?? null, fn (Builder $q, string $code) => $q->whereHas('region', fn (Builder $r) => $r->where('psgc_code', $code)));

        $facilities = Facility::query()
            ->with(['type:id,name', 'cityMunicipality:id,name', 'region:id,name', 'sources:id,facility_id,source_name'])
            ->withCount(['changeRequests' => fn (Builder $q) => $q->where('status', ChangeRequestStatus::Submitted)])
            ->tap($scoped)
            ->when($filters['q'] ?? null, fn (Builder $q, string $text) => $q->where(fn (Builder $w) => $w->where('name', 'like', '%'.addcslashes($text, '%_\\').'%')->orWhere('public_id', $text)))
            ->when($filters['verification_status'] ?? null, fn (Builder $q, string $status) => $q->where('verification_status', $status))
            ->when($filters['publication_status'] ?? null, fn (Builder $q, string $status) => $q->where('publication_status', $status))
            ->orderBy('name')
            ->paginate(Paginated::perPage($request));

        $counts = Facility::query()
            ->tap($scoped)
            ->selectRaw('verification_status, COUNT(*) AS total')
            ->groupBy('verification_status')
            ->pluck('total', 'verification_status');

        return Paginated::response($facilities, AdminFacilityResource::class, $request, ['status_counts' => $counts]);
    }

    public function show(Facility $facility): AdminFacilityResource
    {
        Gate::authorize('view', $facility);

        return new AdminFacilityResource($facility->load(['type', 'cityMunicipality', 'region', 'sources', 'staff', 'verifier'])->loadCount(['changeRequests' => fn (Builder $q) => $q->where('status', ChangeRequestStatus::Submitted)]));
    }

    public function store(StoreFacilityRequest $request, CreateFacilityAction $createFacility, ApproveChangeRequestAction $approve): JsonResponse
    {
        Gate::authorize('create', Facility::class);

        $changeRequest = $createFacility->handle($request->proposed(), $request->user(), $request->validated('note'));
        $changeRequest = $this->applyIfSystemAdmin($changeRequest, $request->user(), $approve);

        return (new ChangeRequestResource($changeRequest->load(['facility', 'submitter'])))->response()->setStatusCode(201);
    }

    /** An edit is a proposal; it does not change the record until approved. */
    public function update(ProposeFacilityRequest $request, Facility $facility, ProposeFacilityChangeAction $propose, ApproveChangeRequestAction $approve): JsonResponse
    {
        Gate::authorize('propose', $facility);

        $changeRequest = $propose->handle($facility, $request->proposed(), $request->user(), $request->validated('note'));
        $changeRequest = $this->applyIfSystemAdmin($changeRequest, $request->user(), $approve);

        // 200: applied now (system admin). 202: waiting for a second person.
        return (new ChangeRequestResource($changeRequest->load(['facility', 'submitter'])))->response()->setStatusCode($changeRequest->status === ChangeRequestStatus::Approved ? 200 : 202);
    }

    /**
     * Edits by people whose role can publish directly (system admins by default) go live at once. The change request is kept (approved by the
     * same person) so the history and audit log still show exactly what changed and who did it.
     * Everyone else still needs a second person to approve.
     */
    private function applyIfSystemAdmin(FacilityChangeRequest $changeRequest, User $user, ApproveChangeRequestAction $approve): FacilityChangeRequest
    {
        return $user->hasPermission(Permission::FacilitiesPublishDirectly) ? $approve->handle($changeRequest, $user, direct: true) : $changeRequest;
    }

    public function reverify(Request $request, Facility $facility, ReverifyFacilityAction $reverify): AdminFacilityResource
    {
        Gate::authorize('review', $facility);

        $input = $request->validate([
            'method' => ['required', Rule::in(['phone_call', 'site_visit', 'official_source', 'facility_confirmation'])],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        return new AdminFacilityResource($reverify->handle($facility, $request->user(), $input['method'], $input['note'] ?? null));
    }

    public function publication(Request $request, Facility $facility, SetPublicationAction $setPublication): AdminFacilityResource
    {
        Gate::authorize('review', $facility);

        $input = $request->validate([
            'status' => ['required', Rule::in([PublicationStatus::Published->value, PublicationStatus::Withdrawn->value])],
            'reason' => ['required', 'string', 'max:500'],
        ]);

        return new AdminFacilityResource($setPublication->handle($facility, PublicationStatus::from($input['status']), $request->user(), $input['reason']));
    }
}
