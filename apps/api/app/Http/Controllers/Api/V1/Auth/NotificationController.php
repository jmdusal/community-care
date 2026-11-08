<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Support\Time;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

/** The signed-in user's in-app notifications (the bell). New ones also arrive live over Reverb. */
final class NotificationController extends Controller
{
    private const LIMIT = 30;

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => $user->notifications()->latest()->limit(self::LIMIT)->get()->map(fn (DatabaseNotification $n): array => $this->present($n))->values(),
            'meta' => ['unread' => $user->unreadNotifications()->count()],
        ]);
    }

    public function read(Request $request, string $notification): JsonResponse
    {
        $request->user()->notifications()->whereKey($notification)->firstOrFail()->markAsRead();

        return response()->json(['meta' => ['unread' => $request->user()->unreadNotifications()->count()]]);
    }

    public function readAll(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['meta' => ['unread' => 0]]);
    }

    /** @return array<string, mixed> */
    private function present(DatabaseNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'kind' => $notification->data['kind'] ?? 'system',
            'title' => $notification->data['title'] ?? '',
            'body' => $notification->data['body'] ?? '',
            'path' => $notification->data['path'] ?? null,
            'read' => $notification->read_at !== null,
            'created_at' => Time::iso($notification->created_at),
        ];
    }
}
