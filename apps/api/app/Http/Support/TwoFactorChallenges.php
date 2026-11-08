<?php

namespace App\Http\Support;

use App\Domain\Identity\Models\User;
use App\Domain\Identity\TwoFactor\EmailCodes;
use App\Domain\Identity\TwoFactor\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * The half-finished sign-in between "password correct" and "code correct".
 * Web: kept in the session. Token clients: a random challenge id kept in the cache.
 * Either way it expires after a few minutes and can be used once.
 */
final class TwoFactorChallenges
{
    public function __construct(private readonly TwoFactorService $twoFactor) {}

    private const SESSION_KEY = 'two_factor.pending';

    public function start(Request $request, User $user, bool $remember, ?string $deviceName): JsonResponse
    {
        $method = $user->two_factor_method ?? 'app';
        if ($method === 'email') {
            $this->twoFactor->sendSignInCode($user);
        }
        $hint = ['two_factor_required' => true, 'method' => $method, ...($method === 'email' ? ['sent_to' => EmailCodes::mask($user->email)] : [])];

        $pending = ['user_id' => $user->id, 'remember' => $remember, 'device_name' => $deviceName, 'expires_at' => now()->addMinutes($this->minutes())->getTimestamp()];

        if ($deviceName === null) {
            $request->session()->put(self::SESSION_KEY, $pending);

            return response()->json(['data' => $hint]);
        }

        $challenge = Str::random(48);
        Cache::put($this->cacheKey($challenge), $pending, now()->addMinutes($this->minutes()));

        return response()->json(['data' => [...$hint, 'challenge' => $challenge]]);
    }

    /** @return array{user: User, remember: bool, device_name: string|null}|null */
    public function find(Request $request, ?string $challenge): ?array
    {
        $pending = $challenge ? Cache::get($this->cacheKey($challenge)) : ($request->hasSession() ? $request->session()->get(self::SESSION_KEY) : null);

        if (! is_array($pending) || ($pending['expires_at'] ?? 0) < now()->getTimestamp()) {
            return null;
        }

        $user = User::query()->find($pending['user_id']);

        return $user === null || ! $user->isActive() ? null : ['user' => $user, 'remember' => (bool) $pending['remember'], 'device_name' => $pending['device_name']];
    }

    public function forget(Request $request, ?string $challenge): void
    {
        if ($challenge) {
            Cache::forget($this->cacheKey($challenge));
        } elseif ($request->hasSession()) {
            $request->session()->forget(self::SESSION_KEY);
        }
    }

    private function cacheKey(string $challenge): string
    {
        return 'two_factor:challenge:'.hash('sha256', $challenge);
    }

    private function minutes(): int
    {
        return (int) config('communitycare.two_factor.challenge_minutes', 5);
    }
}
