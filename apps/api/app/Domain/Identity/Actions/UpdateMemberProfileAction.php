<?php

namespace App\Domain\Identity\Actions;

use App\Domain\Identity\Events\UserAccessChanged;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * An administrator corrects a member's name, email or mobile number. Changing the
 * sign-in email signs the member out of their other devices, because email is the
 * account's identity. Every change is audited.
 */
final class UpdateMemberProfileAction
{
    private const FIELDS = ['name', 'email', 'mobile'];

    /** @param array{name?: string, email?: string, mobile?: string|null} $changes */
    public function handle(User $user, User $actor, array $changes): User
    {
        return DB::transaction(function () use ($user, $actor, $changes): User {
            $before = [];
            $after = [];

            foreach (self::FIELDS as $field) {
                if (array_key_exists($field, $changes) && $changes[$field] !== $user->getAttribute($field)) {
                    $before[$field] = $user->getAttribute($field);
                    $after[$field] = $changes[$field];
                }
            }

            if ($after === []) {
                return $user;
            }

            $user->fill($after);

            if (isset($after['email'])) {
                $user->email_verified_at = null;
                $user->tokens()->delete();
                $user->setRememberToken(Str::random(60));
            }

            $user->save();
            UserAccessChanged::dispatch('user.profile_updated', $user->public_id, $actor->id, $before, $after);

            return $user;
        });
    }
}
