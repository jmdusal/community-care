<?php

namespace App\Domain\Booking\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Appointment email to a patient or to facility staff. No medical information. */
final class AppointmentNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /** @param list<string> $lines */
    public function __construct(
        public readonly string $subjectLine,
        public readonly array $lines,
        public readonly string $actionLabel,
        public readonly string $path,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)->subject($this->subjectLine);
        foreach ($this->lines as $line) {
            $mail->line($line);
        }

        return $mail
            ->action($this->actionLabel, rtrim((string) config('communitycare.frontend_url'), '/').$this->path)
            ->line('In an emergency, call 911 or go to the nearest emergency room.');
    }
}
