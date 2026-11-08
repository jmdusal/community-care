<?php

namespace App\Domain\Identity\Support;

use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Enums\RoleScope;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Collection;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Who may manage which team members (people with "Invite and edit team members").
 * - Nobody can give a role that can do more than they can, or edit someone who has one:
 *   access can never be escalated through the team screen.
 * - With that permission on an all-facilities role (system admins): every member.
 * - Only on an assigned-facilities role (facility admins): members at their own facilities,
 *   with assigned-facility roles only, assigned to their own facilities. A member's
 *   assignments elsewhere are kept untouched.
 */
final class MemberAccess
{
    /** @return list<int> facility ids the actor manages (empty = all) */
    public function managedFacilityIds(User $actor): array
    {
        return $this->isLimited($actor) ? $actor->facilities()->pluck('facilities.id')->all() : [];
    }

    public function isLimited(User $actor): bool
    {
        return ! $actor->hasPermissionEverywhere(Permission::TeamManage);
    }

    /** Roles the actor may give: console roles whose permissions are all within the actor's own. @return Collection<int, Role> */
    public function grantableRoles(User $actor): Collection
    {
        $mine = $actor->permissionKeys();
        $limited = $this->isLimited($actor);

        return Role::query()->orderBy('id')->get()->filter(function (Role $role) use ($mine, $limited): bool {
            if ($role->facilityScope() === RoleScope::None) {
                return false;
            }
            if ($limited && $role->facilityScope() !== RoleScope::Assigned) {
                return false;
            }

            return array_diff(array_map(fn (Permission $p) => $p->value, $role->grants()), $mine) === [];
        })->values();
    }

    /** May the actor edit this member? */
    public function canEdit(User $actor, User $member): bool
    {
        if (! $actor->hasPermission(Permission::TeamManage)) {
            return false;
        }

        $grantable = $this->grantableRoles($actor)->pluck('name');
        if (! $member->roles->every(fn (Role $role) => $grantable->contains($role->name))) {
            return false;
        }

        return ! $this->isLimited($actor)
            || $member->facilities->pluck('id')->intersect($this->managedFacilityIds($actor))->isNotEmpty();
    }

    /**
     * Checks a requested change and returns the facility ids to save.
     *
     * @param  list<string>|null  $roles  role names
     * @param  list<int>|null  $facilityIds
     * @return list<int>|null
     */
    public function authorizeChange(User $actor, ?User $member, ?array $roles, ?array $facilityIds): ?array
    {
        if ($member !== null && ! $this->canEdit($actor, $member->loadMissing('roles', 'facilities'))) {
            throw new AccessDeniedHttpException($this->isLimited($actor)
                ? 'You can only manage members at your own facilities whose roles you could give.'
                : 'This member has a role with more access than yours.');
        }

        if ($roles !== null && array_diff($roles, $this->grantableRoles($actor)->pluck('name')->all()) !== []) {
            throw new AccessDeniedHttpException('You can only give roles that do no more than your own.');
        }

        if (! $this->isLimited($actor) || $facilityIds === null) {
            return $facilityIds;
        }

        $managed = $this->managedFacilityIds($actor);
        if (array_diff($facilityIds, $managed) !== []) {
            throw new AccessDeniedHttpException('You can only assign facilities you manage.');
        }
        if ($member === null && $facilityIds === []) {
            throw new AccessDeniedHttpException('Assign the new member to at least one of your facilities.');
        }

        // Keep assignments at facilities this admin does not manage.
        $elsewhere = $member === null ? [] : array_values(array_diff($member->facilities->pluck('id')->all(), $managed));

        return array_values(array_unique([...$facilityIds, ...$elsewhere]));
    }
}
