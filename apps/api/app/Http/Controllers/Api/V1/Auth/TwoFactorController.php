<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Domain\Identity\TwoFactor\TrustedDevices;
use App\Domain\Identity\TwoFactor\TwoFactorService;
use App\Http\Controllers\Controller;
use App\Http\Support\SignInResponder;
use App\Http\Support\TwoFactorChallenges;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Two-factor sign-in: the second step of signing in, and each person's own settings
 * (set up with an authenticator app, recovery codes, turn off).
 */
final class TwoFactorController extends Controller
{
    public function __construct(private readonly TwoFactorService $twoFactor) {}

    /** POST /auth/two-factor: finish a sign-in with a code from the app, or a recovery code. */
    public function challenge(Request $request, TwoFactorChallenges $challenges, SignInResponder $responder, TrustedDevices $trustedDevices): JsonResponse
    {
        $input = $request->validate([
            'code' => ['nullable', 'required_without:recovery_code', 'string', 'max:10'],
            'recovery_code' => ['nullable', 'string', 'max:20'],
            'challenge' => ['nullable', 'string', 'max:64'],
            'remember_device' => ['nullable', 'boolean'],
        ]);

        $pending = $challenges->find($request, $input['challenge'] ?? null);
        if ($pending === null) {
            throw ValidationException::withMessages(['code' => ['This sign-in expired. Enter your email and password again.']]);
        }

        if (! $this->twoFactor->verify($pending['user'], $input['code'] ?? null, $input['recovery_code'] ?? null)) {
            throw ValidationException::withMessages([isset($input['recovery_code']) && $input['recovery_code'] !== '' ? 'recovery_code' : 'code' => ['That code is not right. Check the time on your phone and try the newest code.']]);
        }

        $challenges->forget($request, $input['challenge'] ?? null);
        $response = $responder->complete($request, $pending['user'], $pending['remember'], $pending['device_name']);

        // "Remember this device": the web gets an encrypted, HTTP-only cookie; apps get the secret to keep.
        if ($request->boolean('remember_device')) {
            $secret = $trustedDevices->remember($pending['user'], $pending['device_name'] ?? Str::limit((string) $request->userAgent(), 100));
            if ($pending['device_name'] === null) {
                $response->withCookie(cookie(TrustedDevices::COOKIE, $secret, $trustedDevices->days() * 24 * 60, '/', null, $request->isSecure(), true, false, 'lax'));
            } else {
                $data = $response->getData(true);
                $data['data']['trusted_device'] = ['token' => $secret, 'days' => $trustedDevices->days()];
                $response->setData($data);
            }
        }

        return $response;
    }

    /** POST /auth/two-factor/resend: email a new sign-in code (email method only, rate-limited). */
    public function resend(Request $request, TwoFactorChallenges $challenges): JsonResponse
    {
        $input = $request->validate(['challenge' => ['nullable', 'string', 'max:64']]);
        $pending = $challenges->find($request, $input['challenge'] ?? null);
        if ($pending === null) {
            throw ValidationException::withMessages(['code' => ['This sign-in expired. Enter your email and password again.']]);
        }

        $this->twoFactor->sendSignInCode($pending['user'], resend: true);

        return response()->json(['data' => ['sent' => true]]);
    }

    /** GET /me/two-factor */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json(['data' => [
            'enabled' => $user->hasTwoFactor(),
            'method' => $user->hasTwoFactor() ? $user->two_factor_method : null,
            'required' => $this->twoFactor->isRequiredFor($user),
            'recovery_codes_left' => $user->hasTwoFactor() ? $this->twoFactor->recoveryCodesLeft($user) : 0,
            'remembered_devices' => app(TrustedDevices::class)->count($user),
            'remember_days' => app(TrustedDevices::class)->days(),
        ]]);
    }

    /** DELETE /me/trusted-devices: every remembered browser and phone asks for a code again. */
    public function forgetDevices(Request $request, TrustedDevices $trustedDevices): JsonResponse
    {
        $trustedDevices->forgetAll($request->user());

        return response()->json(['data' => ['remembered_devices' => 0]])->withCookie(cookie()->forget(TrustedDevices::COOKIE));
    }

    /** POST /me/two-factor/setup: method "app" (QR code) or "email" (a code is emailed now). Needs the current password. */
    public function setup(Request $request): JsonResponse
    {
        $this->confirmPassword($request);
        $input = $request->validate(['method' => ['nullable', 'in:app,email']]);

        return response()->json(['data' => $this->twoFactor->startSetup($request->user(), $input['method'] ?? 'app')]);
    }

    /** POST /me/two-factor/confirm: turns it on and returns the recovery codes, once. */
    public function confirm(Request $request): JsonResponse
    {
        $input = $request->validate(['code' => ['required', 'string', 'max:10']]);
        $codes = $this->twoFactor->confirm($request->user(), $input['code']);

        if ($codes === null) {
            throw ValidationException::withMessages(['code' => ['That code is not right. Enter the 6-digit code your app shows now.']]);
        }

        return response()->json(['data' => ['enabled' => true, 'recovery_codes' => $codes]]);
    }

    /** POST /me/two-factor/recovery-codes: new codes; the old ones stop working. */
    public function recoveryCodes(Request $request): JsonResponse
    {
        $this->confirmPassword($request);
        abort_unless($request->user()->hasTwoFactor(), 409, 'Two-factor sign-in is not on.');

        return response()->json(['data' => ['recovery_codes' => $this->twoFactor->regenerateRecoveryCodes($request->user())]]);
    }

    /** DELETE /me/two-factor: turn it off (not allowed while your role requires it). */
    public function destroy(Request $request): JsonResponse
    {
        $this->confirmPassword($request);
        $this->twoFactor->disable($request->user(), $request->user());

        return response()->json(['data' => ['enabled' => false]]);
    }

    private function confirmPassword(Request $request): void
    {
        $request->validate(['password' => ['required', 'string']]);

        if (! Hash::check($request->string('password')->toString(), $request->user()->password)) {
            throw ValidationException::withMessages(['password' => ['That password is not right.']]);
        }
    }
}
