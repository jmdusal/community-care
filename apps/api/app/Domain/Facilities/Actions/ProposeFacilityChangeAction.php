<?php

namespace App\Domain\Facilities\Actions;

use App\Domain\Facilities\Enums\ChangeOrigin;
use App\Domain\Facilities\Enums\ChangeRequestStatus;
use App\Domain\Facilities\Events\FacilityChangeSubmitted;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityChangeRequest;
use App\Domain\Facilities\Support\FacilitySnapshot;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Records a proposed edit as a change request. Nothing about the published
 * record changes until a different person approves it.
 */
final class ProposeFacilityChangeAction
{
    /** @param array<string, mixed> $proposed validated fields in FacilitySnapshot shape */
    public function handle(Facility $facility, array $proposed, User $submitter, ?string $note = null, ChangeOrigin $origin = ChangeOrigin::Edit): FacilityChangeRequest
    {
        $current = $origin === ChangeOrigin::Create ? [] : FacilitySnapshot::of($facility);
        $changes = FacilitySnapshot::diff($current, $proposed);

        if ($changes === []) {
            throw ValidationException::withMessages(['changes' => ['Nothing changed compared with the current record.']]);
        }

        return DB::transaction(function () use ($facility, $changes, $submitter, $note, $origin): FacilityChangeRequest {
            $request = FacilityChangeRequest::query()->create([
                'facility_id' => $facility->id,
                'submitted_by' => $submitter->id,
                'origin' => $origin,
                'changes' => $changes,
                'note' => $note,
                'status' => ChangeRequestStatus::Submitted,
            ]);

            FacilityChangeSubmitted::dispatch($facility->id, $facility->public_id, $submitter->id, $request->public_id, null, ['fields' => array_keys($changes), 'origin' => $origin->value]);

            return $request;
        });
    }
}
