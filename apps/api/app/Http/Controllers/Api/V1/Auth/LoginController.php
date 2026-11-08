<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Domain\Identity\Models\User;
use App\Domain\Identity\TwoFactor\TrustedDevices;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Support\SignInResponder;
use App\Http\Support\TwoFactorChallenges;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Two sign-in modes (technical documentation, section 9.4):
 * - web app: cookie session (Sanctum SPA, CSRF protected), no token returned;
 * - mobile/API clients: personal access token, requires device_name.
 */
final class LoginController extends Controller
{
    public function __construct(
        private readonly SignInResponder $responder,
        private readonly TwoFactorChallenges $challenges,
        private readonly TrustedDevices $trustedDevices,
    ) {}

    public function __invoke(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('email', $request->string('email')->lower()->toString())->first();

        if ($user === null || ! Hash::check($request->string('password')->toString(), $user->password) || ! $user->isActive()) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        $deviceName = $request->usesSession() ? null : $request->string('device_name')->toString();

        // Two-factor accounts: the password alone is not enough, unless this browser or phone
        // was remembered after a correct code ("Remember this device"). Otherwise remember who
        // passed the password, and finish only after POST /auth/two-factor with a code.
        $trusted = $request->cookie(TrustedDevices::COOKIE) ?? $request->string('trusted_device')->toString();
        if ($user->hasTwoFactor() && ! $this->trustedDevices->recognises($user, $trusted === '' ? null : $trusted)) {
            return $this->challenges->start($request, $user, $request->boolean('remember'), $deviceName);
        }

        return $this->responder->complete($request, $user, $request->boolean('remember'), $deviceName);
    }
}
