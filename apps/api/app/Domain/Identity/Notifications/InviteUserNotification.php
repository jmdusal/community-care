<?php

namespace App\Domain\Identity\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Invitation email with a link to set a password (a password-reset token). */
final class InviteUserNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly string $token, public readonly string $inviterName) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = rtrim((string) config('communitycare.frontend_url'), '/').'/reset-password?'.http_build_query([
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
            'invite' => 1,
        ]);

        return (new MailMessage)
            ->subject('You are invited to the CommunityCare admin console')
            ->line("{$this->inviterName} invited you to help keep the CommunityCare directory accurate.")
            ->action('Set your password', $url)
            ->line('This link expires in '.config('auth.passwords.users.expire').' minutes. Ask for a new invite if it expires.');
    }
}
