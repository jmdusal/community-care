<?php

namespace App\Domain\Facilities\Actions;

use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Events\FacilityReverified;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;

/** A verifier confirms the current record against a source (e.g. a phone call), resetting the stale clock. */
final class ReverifyFacilityAction
{
    public function handle(Facility $facility, User $verifier, string $method, ?string $note): Facility
    {
        return DB::transaction(function () use ($facility, $verifier, $method, $note): Facility {
            $before = ['status' => $facility->verification_status->value, 'verified_at' => $facility->verified_at?->toIso8601String()];

            $facility->update([
                'verification_status' => VerificationStatus::Verified,
                'verified_at' => now(),
                'verified_by' => $verifier->id,
                'verification_method' => $method,
                'review_notes' => $note ?? $facility->review_notes,
            ]);

            FacilityReverified::dispatch($facility->id, $facility->public_id, $verifier->id, null, $before, ['status' => 'verified', 'method' => $method]);

            return $facility;
        });
    }
}
