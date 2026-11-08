<?php

namespace App\Domain\Identity\Actions;

use App\Domain\Identity\Events\UserAccessChanged;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use App\Domain\Identity\TwoFactor\TrustedDevices;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Changes a member's roles, status and facility assignments. Admins cannot
 * change their own roles or status (prevents locking the last admin out).
 */
final class UpdateUserAccessAction
{
    /**
     * @param  list<string>|null  $roles  role names
     * @param  list<int>|null  $facilityIds
     */
    public function handle(User $user, User $actor, ?array $roles, ?string $status, ?array $facilityIds): User
    {
        if ($user->is($actor) && ($roles !== null || $status !== null)) {
            throw new ConflictHttpException('You cannot change your own roles or status. Ask another administrator.');
        }

        return DB::transaction(function () use ($user, $actor, $roles, $status, $facilityIds): User {
            $user->load('roles', 'facilities');

            if ($roles !== null) {
                $before = $user->roles->pluck('name')->sort()->values()->all();
                $after = collect($roles)->sort()->values()->all();

                if ($before !== $after) {
                    $user->roles()->sync(Role::idsFor($roles));
                    UserAccessChanged::dispatch('user.roles_changed', $user->public_id, $actor->id, ['roles' => $before], ['roles' => $after]);
                }
            }

            if ($status !== null && $status !== $user->status) {
                UserAccessChanged::dispatch('user.status_changed', $user->public_id, $actor->id, ['status' => $user->status], ['status' => $status]);
                $user->update(['status' => $status]);

                if ($status === 'suspended') {
                    $user->tokens()->delete();
                    app(TrustedDevices::class)->forgetAll($user);
                    // Also ends "keep me signed in" cookies on every device.
                    $user->setRememberToken(Str::random(60));
                    $user->save();
                }
            }

            if ($facilityIds !== null) {
                $this->syncFacilities($user, $facilityIds, $actor);
            }

            return $user->refresh()->load('roles', 'facilities');
        });
    }

    /** @param list<int> $facilityIds */
    public function syncFacilities(User $user, array $facilityIds, User $actor): void
    {
        $before = $user->facilities()->pluck('facilities.public_id')->sort()->values()->all();
        $user->facilities()->sync(collect($facilityIds)->mapWithKeys(fn (int $id): array => [$id => ['assigned_by' => $actor->id, 'assigned_at' => now()]])->all());
        $after = $user->facilities()->pluck('facilities.public_id')->sort()->values()->all();

        if ($before !== $after) {
            UserAccessChanged::dispatch('user.facilities_changed', $user->public_id, $actor->id, ['facilities' => $before], ['facilities' => $after]);
        }
    }
}
