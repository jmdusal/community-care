<?php

namespace App\Http\Support;

use App\Domain\Identity\Models\User;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/** Finishes a sign-in: a cookie session for the web app, or a personal access token for apps and tools. */
final class SignInResponder
{
    public function complete(Request $request, User $user, bool $remember, ?string $deviceName): JsonResponse
    {
        $user->forceFill(['last_active_at' => now()])->save();

        if ($deviceName === null) {
            // "Keep me signed in": a remember-me cookie valid for remember_me_days.
            $guard = Auth::guard('web');
            $guard->setRememberDuration(config('communitycare.remember_me_days') * 24 * 60);
            $guard->login($user, $remember);
            $request->session()->regenerate();

            return response()->json(['data' => ['user' => new UserResource($user->load(['roles', 'facilities:id,public_id,name']))]]);
        }

        return response()->json(['data' => [
            'token' => $user->createToken($deviceName)->plainTextToken,
            'token_type' => 'Bearer',
            'user' => new UserResource($user->load(['roles', 'facilities:id,public_id,name'])),
        ]]);
    }
}
