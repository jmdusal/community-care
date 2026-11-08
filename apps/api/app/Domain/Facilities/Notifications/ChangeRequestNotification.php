<?php

namespace App\Domain\Facilities\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Email about a change request: "needs your review" for reviewers, or
 * "approved/rejected" for the submitter. Contains no personal data beyond the
 * facility name and a link to the admin console.
 */
final class ChangeRequestNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly string $subjectLine,
        public readonly string $facilityName,
        public readonly string $message,
        public readonly string $path,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->subjectLine)
            ->line("Facility: {$this->facilityName}")
            ->line($this->message)
            ->action('Open the admin console', rtrim((string) config('communitycare.frontend_url'), '/').$this->path);
    }
}
