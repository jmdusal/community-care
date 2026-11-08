<?php

namespace App\Domain\Facilities\Policies;

use App\Domain\Facilities\Models\FacilityChangeRequest;
use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Models\User;

final class ChangeRequestPolicy
{
    public function view(User $user, FacilityChangeRequest $request): bool
    {
        return $user->isActive() && ($user->seesAllFacilities() || $request->submitted_by === $user->id || $user->isAssignedTo($request->facility));
    }

    /**
     * Verifiers and admins decide. Self-approval is refused in the action with a
     * clear 409 message rather than a bare 403.
     */
    public function review(User $user, FacilityChangeRequest $request): bool
    {
        return $user->isActive() && $user->canAt(Permission::FacilitiesReview, $request->facility);
    }

    public function withdraw(User $user, FacilityChangeRequest $request): bool
    {
        return $user->isActive() && $request->submitted_by === $user->id;
    }
}
