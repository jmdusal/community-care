<?php

namespace App\Domain\Booking\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** The 6-digit code a guest types to confirm their appointment request. Sent at once, not queued. */
final class GuestBookingCodeNotification extends Notification
{
    public function __construct(
        public readonly string $code,
        public readonly string $facilityName,
        public readonly int $minutes,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Your CommunityCare code: {$this->code}")
            ->line("Use this code to send your appointment request to {$this->facilityName}:")
            ->line("**{$this->code}**")
            ->line("It works for {$this->minutes} minutes. If you did not ask for it, you can ignore this email.");
    }
}
