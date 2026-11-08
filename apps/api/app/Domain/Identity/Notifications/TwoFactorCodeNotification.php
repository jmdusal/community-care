<?php

namespace App\Domain\Identity\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * A one-time sign-in code by email. Sent immediately (not queued) so signing in never
 * waits on the queue worker.
 */
final class TwoFactorCodeNotification extends Notification
{
    public function __construct(
        public readonly string $code,
        public readonly string $purpose,
        public readonly int $minutes,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $setup = $this->purpose === 'setup';

        return (new MailMessage)
            ->subject("{$this->code} is your CommunityCare ".($setup ? 'setup' : 'sign-in').' code')
            ->line($setup ? 'Enter this code to turn on two-factor sign-in:' : 'Enter this code to finish signing in:')
            ->line("**{$this->code}**")
            ->line("It works once and expires in {$this->minutes} minutes.")
            ->line("If you didn't try to sign in, change your password: someone may know it.");
    }
}
