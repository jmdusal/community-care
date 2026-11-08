<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Domain\Identity\Events\UserAccessChanged;
use App\Domain\Identity\Models\User;
use App\Domain\Identity\TwoFactor\TrustedDevices;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

/**
 * Forgot / reset password, also used to accept an invitation (an invite is a
 * reset token for an "invited" account).
 */
final class PasswordController extends Controller
{
    /** Always the same answer, so the endpoint cannot be used to find out who has an account. */
    public function forgot(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email', 'max:255']]);
        Password::broker()->sendResetLink(['email' => mb_strtolower($request->string('email')->toString())]);

        return response()->json(['data' => ['message' => 'If that email has an account, a reset link is on its way.']], 202);
    }

    public function reset(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(6)->letters()->numbers()],
        ]);

        $status = Password::broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $wasInvited = $user->status === 'invited';
                $user->forceFill(['password' => $password, 'status' => $wasInvited ? 'active' : $user->status])->save();
                $user->tokens()->delete();
                app(TrustedDevices::class)->forgetAll($user);
                // Also ends "keep me signed in" cookies on every device.
                $user->setRememberToken(Str::random(60));
                $user->save();

                UserAccessChanged::dispatch($wasInvited ? 'user.invite_accepted' : 'user.password_reset', $user->public_id, $user->id, null, ['status' => $user->status]);
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => [__($status)]]);
        }

        return response()->json(['data' => ['message' => 'Password set. You can sign in now.']]);
    }
}
