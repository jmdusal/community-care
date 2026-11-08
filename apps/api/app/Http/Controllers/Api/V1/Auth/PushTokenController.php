<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Domain\Shared\Notifications\PushToken;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** The mobile app registers its Expo push token after sign-in, and removes it at sign-out. */
final class PushTokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $input = $request->validate([
            'token' => ['required', 'string', 'max:255', 'regex:/^(ExponentPushToken|ExpoPushToken)\\[[A-Za-z0-9_\\-]+\\]$/'],
            'platform' => ['required', 'in:ios,android'],
        ]);

        // A device belongs to whoever signed in on it last.
        PushToken::query()->updateOrCreate(['token' => $input['token']], ['user_id' => $request->user()->id, 'platform' => $input['platform']]);

        return response()->json(['data' => ['registered' => true]], 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $input = $request->validate(['token' => ['required', 'string', 'max:255']]);
        $request->user()->pushTokens()->where('token', $input['token'])->delete();

        return response()->json(null, 204);
    }
}
