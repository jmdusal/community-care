<?php

namespace App\Domain\Identity\Actions;

use App\Domain\Identity\Events\UserAccessChanged;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use App\Domain\Identity\Notifications\InviteUserNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * Creates an "invited" account with an unusable random password and emails a
 * set-password link. The account becomes active when the password is set.
 */
final class InviteUserAction
{
    public function __construct(private readonly UpdateUserAccessAction $updateAccess) {}

    /**
     * @param  list<string>  $roles  role names
     * @param  list<int>  $facilityIds
     */
    public function handle(string $name, string $email, array $roles, array $facilityIds, User $inviter): User
    {
        $user = DB::transaction(function () use ($name, $email, $roles, $facilityIds, $inviter): User {
            $user = User::query()->create([
                'name' => $name,
                'email' => mb_strtolower($email),
                'password' => Str::password(40),
                'status' => 'invited',
            ]);

            $user->roles()->sync(Role::idsFor($roles));
            $this->updateAccess->syncFacilities($user, $facilityIds, $inviter);

            UserAccessChanged::dispatch('user.invited', $user->public_id, $inviter->id, null, [
                'email' => $user->email,
                'roles' => $roles,
                'facilities' => count($facilityIds),
            ]);

            return $user;
        });

        $user->notify(new InviteUserNotification(Password::broker()->createToken($user), $inviter->name));

        return $user;
    }
}
