<?php

namespace App\Domain\Identity\TwoFactor;

use App\Domain\Identity\Models\User;
use App\Domain\Identity\Notifications\TwoFactorCodeNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

/**
 * One-time 6-digit codes sent by email for two-factor sign-in. Each code is stored only
 * as a keyed hash, expires after a few minutes, allows a few wrong tries, and works once.
 * A new code can be sent at most every 30 seconds.
 */
final class EmailCodes
{
    public const MINUTES = 10;

    private const MAX_ATTEMPTS = 5;

    private const RESEND_SECONDS = 30;

    /**
     * @param  'setup'|'sign_in'  $purpose
     * @param  bool  $strict  true for "send again" (refused within 30 s); false when a sign-in
     *                        starts: a pending code is reused, otherwise a new one is sent
     */
    public function send(User $user, string $purpose, bool $strict = true): void
    {
        $throttle = "two_factor:email:sent:{$purpose}:{$user->id}";
        if (! $strict && Cache::has($this->key($user, $purpose))) {
            // A sign-in started moments ago: the code already sent is still valid.
            return;
        }
        // "Send again" is limited to one code per 30 seconds. A new sign-in always gets a code
        // (the login rate limit still applies), e.g. right after the previous code was used.
        if ($strict && Cache::has($throttle)) {
            throw ValidationException::withMessages(['code' => ['A code was just sent. Wait a moment before asking for another.']]);
        }

        $code = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);
        Cache::put($this->key($user, $purpose), ['hash' => $this->hash($code), 'attempts' => 0], now()->addMinutes(self::MINUTES));
        Cache::put($throttle, true, now()->addSeconds(self::RESEND_SECONDS));

        Notification::sendNow($user, new TwoFactorCodeNotification($code, $purpose, self::MINUTES));
    }

    /** @param 'setup'|'sign_in' $purpose */
    public function check(User $user, string $purpose, string $code): bool
    {
        $key = $this->key($user, $purpose);
        $stored = Cache::get($key);
        if (! is_array($stored)) {
            return false;
        }

        if (hash_equals($stored['hash'], $this->hash(preg_replace('/\s+/', '', $code) ?? ''))) {
            Cache::forget($key);

            return true;
        }

        $stored['attempts']++;
        $stored['attempts'] >= self::MAX_ATTEMPTS ? Cache::forget($key) : Cache::put($key, $stored, now()->addMinutes(self::MINUTES));

        return false;
    }

    /** "ja***@example.org": enough to recognise, not enough to harvest. */
    public static function mask(string $email): string
    {
        [$name, $domain] = array_pad(explode('@', $email, 2), 2, '');

        return mb_substr($name, 0, 2).str_repeat('*', max(1, min(5, mb_strlen($name) - 2))).'@'.$domain;
    }

    private function key(User $user, string $purpose): string
    {
        return "two_factor:email:{$purpose}:{$user->id}";
    }

    private function hash(string $code): string
    {
        return hash_hmac('sha256', $code, (string) config('app.key'));
    }
}
