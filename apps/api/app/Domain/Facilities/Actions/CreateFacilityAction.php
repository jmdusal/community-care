<?php

namespace App\Domain\Facilities\Actions;

use App\Domain\Facilities\Enums\ChangeOrigin;
use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityChangeRequest;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * A new facility starts as an unpublished draft with a "create" change request
 * holding every proposed field. Approval by another person publishes it.
 */
final class CreateFacilityAction
{
    public function __construct(private readonly ProposeFacilityChangeAction $propose) {}

    /** @param array<string, mixed> $proposed */
    public function handle(array $proposed, User $creator, ?string $note = null): FacilityChangeRequest
    {
        return DB::transaction(function () use ($proposed, $creator, $note): FacilityChangeRequest {
            $facility = Facility::query()->create([
                'name' => $proposed['name'],
                'verification_status' => VerificationStatus::PendingReview,
                'publication_status' => PublicationStatus::Unpublished,
            ]);

            return $this->propose->handle($facility, $proposed, $creator, $note, ChangeOrigin::Create);
        });
    }
}
