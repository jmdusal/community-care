<?php

namespace App\Domain\Facilities\Actions;

use App\Domain\Facilities\Enums\ChangeOrigin;
use App\Domain\Facilities\Enums\ChangeRequestStatus;
use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Events\FacilityRejected;
use App\Domain\Facilities\Exceptions\ChangeRequestConflict;
use App\Domain\Facilities\Models\FacilityChangeRequest;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;

/** Rejects a change request with a reason. A rejected "create" leaves the draft rejected and unpublished. */
final class RejectChangeRequestAction
{
    public function handle(FacilityChangeRequest $request, User $reviewer, string $reason): FacilityChangeRequest
    {
        return DB::transaction(function () use ($request, $reviewer, $reason): FacilityChangeRequest {
            $request = FacilityChangeRequest::query()->lockForUpdate()->findOrFail($request->id);

            if ($request->status !== ChangeRequestStatus::Submitted) {
                throw ChangeRequestConflict::alreadyDecided($request->status->value);
            }

            $request->update(['status' => ChangeRequestStatus::Rejected, 'reviewed_by' => $reviewer->id, 'reviewed_at' => now(), 'reason' => $reason]);

            $facility = $request->facility;
            if ($request->origin === ChangeOrigin::Create) {
                $facility->update(['verification_status' => VerificationStatus::Rejected, 'review_notes' => $reason]);
            }

            FacilityRejected::dispatch($facility->id, $facility->public_id, $reviewer->id, $request->public_id, null, ['reason' => $reason]);

            return $request->refresh();
        });
    }
}
