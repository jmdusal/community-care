<?php

namespace App\Domain\Facilities\Actions;

use App\Domain\Facilities\Enums\ChangeRequestStatus;
use App\Domain\Facilities\Events\ChangeRequestWithdrawn;
use App\Domain\Facilities\Exceptions\ChangeRequestConflict;
use App\Domain\Facilities\Models\FacilityChangeRequest;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;

final class WithdrawChangeRequestAction
{
    public function handle(FacilityChangeRequest $request, User $user): FacilityChangeRequest
    {
        if ($request->submitted_by !== $user->id) {
            throw ChangeRequestConflict::notSubmitter();
        }

        if ($request->status !== ChangeRequestStatus::Submitted) {
            throw ChangeRequestConflict::alreadyDecided($request->status->value);
        }

        return DB::transaction(function () use ($request, $user): FacilityChangeRequest {
            $request->update(['status' => ChangeRequestStatus::Withdrawn]);
            ChangeRequestWithdrawn::dispatch($request->facility_id, $request->facility->public_id, $user->id, $request->public_id);

            return $request;
        });
    }
}
