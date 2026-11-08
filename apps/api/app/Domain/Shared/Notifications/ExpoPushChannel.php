<?php

namespace App\Domain\Shared\Notifications;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Sends a notification to the person's phones through Expo's push service.
 * Tokens Expo reports as no longer registered are removed. Failures are logged,
 * never thrown: the in-app notification still exists.
 */
final class ExpoPushChannel
{
    public function send(object $notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toExpoPush') || ! method_exists($notifiable, 'pushTokens')) {
            return;
        }

        $tokens = $notifiable->pushTokens()->pluck('token')->all();
        if ($tokens === []) {
            return;
        }

        $message = $notification->toExpoPush($notifiable);
        $messages = array_map(fn (string $token): array => ['to' => $token, 'sound' => 'default', ...$message], $tokens);

        try {
            $response = Http::acceptJson()->asJson()->timeout(10)
                ->post((string) config('communitycare.push.expo_url'), $messages)
                ->throw()
                ->json('data') ?? [];
        } catch (Throwable $exception) {
            Log::warning('Expo push failed.', ['error' => $exception->getMessage()]);

            return;
        }

        foreach ($response as $index => $ticket) {
            if (($ticket['status'] ?? null) === 'error' && ($ticket['details']['error'] ?? null) === 'DeviceNotRegistered' && isset($tokens[$index])) {
                PushToken::query()->where('token', $tokens[$index])->delete();
            }
        }

        PushToken::query()->whereIn('token', $tokens)->update(['last_used_at' => now()]);
    }
}
