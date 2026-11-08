<?php

namespace App\Domain\Facilities\Policies;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Models\User;

/**
 * Record-level rules (docs/roles-and-permissions.md): admins and verifiers see
 * every facility; facility staff only the ones assigned to them.
 */
final class FacilityPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isActive() && $user->hasPermission(Permission::FacilitiesView);
    }

    public function view(User $user, Facility $facility): bool
    {
        return $user->isActive() && $user->canAt(Permission::FacilitiesView, $facility);
    }

    /** Propose an edit (it still needs a second person to approve it, unless they publish directly). */
    public function propose(User $user, Facility $facility): bool
    {
        return $user->isActive() && $user->canAt(Permission::FacilitiesEdit, $facility);
    }

    public function create(User $user): bool
    {
        return $user->isActive() && $user->hasPermission(Permission::FacilitiesCreate);
    }

    /** Re-verify, withdraw or restore: verifiers and admins, and facility admins for their facilities. */
    public function review(User $user, Facility $facility): bool
    {
        return $user->isActive() && $user->canAt(Permission::FacilitiesReview, $facility);
    }
}
