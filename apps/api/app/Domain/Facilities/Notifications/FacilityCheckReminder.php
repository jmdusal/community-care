<?php

namespace App\Domain\Facilities\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** The monthly "please check your facility details" email to facility staff. */
final class FacilityCheckReminder extends Notification implements ShouldQueue
{
    use Queueable;

    /** @param list<array{name: string, last: string, path: string}> $facilities */
    public function __construct(public readonly array $facilities) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $count = count($this->facilities);
        $mail = (new MailMessage)
            ->subject($count === 1 ? "Monthly check: is {$this->facilities[0]['name']} still correct?" : "Monthly check: {$count} facilities to review")
            ->line('People use CommunityCare to find your facility. Please take a minute to check that its hours, phone numbers and services are still correct.');

        foreach ($this->facilities as $facility) {
            $mail->line("• {$facility['name']} (last checked: {$facility['last']})");
        }

        return $mail
            ->action($count === 1 ? 'Check this facility' : 'Check your facilities', rtrim((string) config('communitycare.frontend_url'), '/').($count === 1 ? $this->facilities[0]['path'] : '/admin/facilities'))
            ->line('If anything changed, propose an edit. If everything is still right, ask your facility admin or a verifier to confirm it.');
    }
}
