<?php

namespace App\Domain\Facilities\Actions;

use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Events\FacilityPublicationChanged;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;

/** Withdraws a record from the public directory (with a reason) or restores it. */
final class SetPublicationAction
{
    public function handle(Facility $facility, PublicationStatus $status, User $actor, string $reason): Facility
    {
        if ($facility->publication_status === $status) {
            return $facility;
        }

        return DB::transaction(function () use ($facility, $status, $actor, $reason): Facility {
            $before = $facility->publication_status->value;
            $facility->update(['publication_status' => $status]);

            FacilityPublicationChanged::dispatch($facility->id, $facility->public_id, $actor->id, null, ['publication' => $before], ['publication' => $status->value, 'reason' => $reason]);

            return $facility;
        });
    }
}
