<?php

namespace App\Domain\Facilities\Actions;

use App\Domain\Facilities\Contracts\FacilityWriter;
use App\Domain\Facilities\Enums\ChangeOrigin;
use App\Domain\Facilities\Enums\ChangeRequestStatus;
use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Events\FacilityApproved;
use App\Domain\Facilities\Exceptions\ChangeRequestConflict;
use App\Domain\Facilities\Models\FacilityChangeRequest;
use App\Domain\Facilities\Support\FacilitySnapshot;
use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Four-eyes approval: a different person applies the proposed values, the
 * record becomes verified, and a "create" request publishes the new facility.
 * Refused if the facility changed since the request was made.
 */
final class ApproveChangeRequestAction
{
    public function __construct(private readonly FacilityWriter $facilities) {}

    /**
     * @param  bool  $direct  a system admin's own change applied at once (the one exception to four-eyes review)
     */
    public function handle(FacilityChangeRequest $request, User $reviewer, bool $direct = false): FacilityChangeRequest
    {
        return DB::transaction(function () use ($request, $reviewer, $direct): FacilityChangeRequest {
            $request = FacilityChangeRequest::query()->lockForUpdate()->findOrFail($request->id);

            if ($request->status !== ChangeRequestStatus::Submitted) {
                throw ChangeRequestConflict::alreadyDecided($request->status->value);
            }

            if ($request->submitted_by === $reviewer->id && ! ($direct && $reviewer->hasPermission(Permission::FacilitiesPublishDirectly))) {
                throw ChangeRequestConflict::selfApproval();
            }

            $facility = $request->facility()->lockForUpdate()->firstOrFail();

            if ($request->origin === ChangeOrigin::Edit) {
                $current = FacilitySnapshot::of($facility);
                $moved = array_keys(array_filter($request->changes, fn (array $change, string $field): bool => ($current[$field] ?? null) !== $change['before'], ARRAY_FILTER_USE_BOTH));

                if ($moved !== []) {
                    throw ChangeRequestConflict::recordChanged($moved);
                }
            }

            $after = array_map(fn (array $change): mixed => $change['after'], $request->changes);
            $facility = $this->facilities->applyReviewedChanges($facility, $after, $reviewer->id);

            if ($request->origin === ChangeOrigin::Create && $facility->publication_status === PublicationStatus::Unpublished) {
                $facility->update(['publication_status' => PublicationStatus::Published]);
            }

            $request->update(['status' => ChangeRequestStatus::Approved, 'reviewed_by' => $reviewer->id, 'reviewed_at' => now()]);

            FacilityApproved::dispatch(
                $facility->id,
                $facility->public_id,
                $reviewer->id,
                $request->public_id,
                array_map(fn (array $change): mixed => $change['before'], $request->changes),
                $after,
            );

            return $request->refresh();
        });
    }
}
