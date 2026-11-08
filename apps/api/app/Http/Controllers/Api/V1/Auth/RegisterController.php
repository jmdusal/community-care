<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/** Creates a patient account (the only self-service role) and signs the person in. */
final class RegisterController extends Controller
{
    public function __invoke(RegisterRequest $request): JsonResponse
    {
        $user = DB::transaction(function () use ($request): User {
            $user = User::query()->create([
                'name' => $request->string('name')->trim()->toString(),
                'email' => $request->string('email')->toString(),
                'mobile' => $request->string('mobile')->toString(),
                'password' => $request->string('password')->toString(),
                'privacy_consent_at' => now(),
                'status' => 'active',
            ]);
            $user->roles()->attach(Role::idsFor([RoleName::Patient]));

            return $user;
        });

        if ($request->hasSession()) {
            Auth::guard('web')->login($user);
            $request->session()->regenerate();
        }

        return response()->json(['data' => ['user' => new UserResource($user->load('roles'))]], 201);
    }
}
