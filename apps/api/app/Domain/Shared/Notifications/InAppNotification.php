<?php

namespace App\Domain\Shared\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * A notification shown in the app's bell: stored in the notifications table and pushed
 * live over Reverb to the user's private channel. Short text and a link only; never
 * medical details or another person's contact information.
 */
final class InAppNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  'appointment'|'change_request'|'program'|'system'  $kind
     * @param  list<string>  $refresh  data on screen to reload when this arrives (e.g. "appointments")
     */
    public function __construct(
        public readonly string $kind,
        public readonly string $title,
        public readonly string $body,
        public readonly string $path,
        public readonly array $refresh = [],
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        $channels = ['database', 'broadcast'];

        // Phones with the mobile app signed in also get a push notification.
        if (method_exists($notifiable, 'pushTokens') && $notifiable->pushTokens()->exists()) {
            $channels[] = ExpoPushChannel::class;
        }

        return $channels;
    }

    /** @return array{title: string, body: string, data: array{path: string, kind: string}} */
    public function toExpoPush(object $notifiable): array
    {
        return ['title' => $this->title, 'body' => $this->body, 'data' => ['path' => $this->path, 'kind' => $this->kind]];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return ['kind' => $this->kind, 'title' => $this->title, 'body' => $this->body, 'path' => $this->path, 'refresh' => $this->refresh];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([...$this->toArray($notifiable), 'created_at' => now()->toIso8601String()]);
    }

    public function databaseType(object $notifiable): string
    {
        return 'in_app';
    }
}
