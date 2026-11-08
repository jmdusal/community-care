<?php

namespace App\Domain\Booking\Support;

use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Notifications\AppointmentNotification;
use App\Domain\Shared\Notifications\InAppNotification;
use Illuminate\Support\Facades\Notification;

/**
 * Reaches the person an appointment is for: their account when they have one (email, plus
 * in-app and push when a title is given), otherwise the email they gave as a guest or caller.
 */
final class AppointmentRecipient
{
    public static function notify(Appointment $appointment, AppointmentNotification $email, ?string $inAppTitle = null, ?string $inAppBody = null): void
    {
        if ($appointment->patient !== null) {
            $appointment->patient->notify($email);
            if ($inAppTitle !== null) {
                $appointment->patient->notify(new InAppNotification('appointment', $inAppTitle, (string) $inAppBody, '/account/appointments', ['my-appointments']));
            }

            return;
        }

        if ($appointment->contact_email !== null) {
            Notification::route('mail', $appointment->contact_email)->notify($email);
        }
    }

    /** Account holders open My appointments; guests open the reference-code page (they type their email there). */
    public static function path(Appointment $appointment): string
    {
        return $appointment->patient_id !== null
            ? '/account/appointments'
            : '/appointments/manage?ref='.urlencode($appointment->reference_code);
    }

    /** "Mon, Nov 10, 2026 8:00 AM" in Philippine time. */
    public static function when(Appointment $appointment): string
    {
        return $appointment->starts_at->timezone(config('communitycare.display_timezone'))->format('D, M j, Y g:i A');
    }
}
