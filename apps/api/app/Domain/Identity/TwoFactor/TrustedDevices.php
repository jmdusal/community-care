<?php

namespace App\Domain\Identity\TwoFactor;

use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * "Remember this device": after a correct two-factor code, the browser (cookie) or phone
 * (secure storage) gets a random secret. Signing in again with the password and that
 * secret skips the code until it expires. Only a hash is stored here, and every
 * remembered device is forgotten when the password changes or two-factor is reset.
 */
final class TrustedDevices
{
    public const COOKIE = 'cc_trusted_device';

    public function days(): int
    {
        return max(1, (int) config('communitycare.two_factor.trusted_device_days', 30));
    }

    /** @return string the secret to give the device (never stored) */
    public function remember(User $user, ?string $name): string
    {
        $secret = Str::random(64);

        DB::table('trusted_devices')->insert([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $secret),
            'name' => $name === null ? null : Str::limit($name, 117),
            'last_used_at' => now(),
            'expires_at' => now()->addDays($this->days()),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $secret;
    }

    /** Is this secret a remembered, unexpired device of this user? Marks it as used. */
    public function recognises(User $user, ?string $secret): bool
    {
        if ($secret === null || strlen($secret) !== 64) {
            return false;
        }

        $id = DB::table('trusted_devices')
            ->where('user_id', $user->id)
            ->where('token_hash', hash('sha256', $secret))
            ->where('expires_at', '>', now())
            ->value('id');

        if ($id === null) {
            return false;
        }

        DB::table('trusted_devices')->where('id', $id)->update(['last_used_at' => now()]);

        return true;
    }

    public function count(User $user): int
    {
        return DB::table('trusted_devices')->where('user_id', $user->id)->where('expires_at', '>', now())->count();
    }

    /** Every device asks for a code again (password changed, two-factor reset, suspended, or by request). */
    public function forgetAll(User $user): void
    {
        DB::table('trusted_devices')->where('user_id', $user->id)->delete();
    }
}
