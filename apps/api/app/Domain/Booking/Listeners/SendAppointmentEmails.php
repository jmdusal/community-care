<?php

namespace App\Domain\Booking\Listeners;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Events\AppointmentRequested;
use App\Domain\Booking\Events\AppointmentStatusChanged;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Notifications\AppointmentNotification;
use App\Domain\Booking\Support\AppointmentRecipient;
use App\Domain\Shared\Notifications\InAppNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Notification;

/**
 * Emails about appointments, sent from the queue:
 * - requested online (patient or guest): the person (received) and the facility's staff (please review);
 * - booked by staff: the person, if they gave an email (confirmed);
 * - confirmed / declined / cancelled by the clinic: the person;
 * - cancelled by the person: the facility's staff.
 *
 * Patients with an account also get an in-app notification (and push on the mobile app);
 * guests and callers without an account are reached by email only.
 */
final class SendAppointmentEmails implements ShouldQueue
{
    public function handleRequested(AppointmentRequested $event): void
    {
        $appointment = $this->load($event->appointmentId);
        if ($appointment === null) {
            return;
        }

        $when = AppointmentRecipient::when($appointment);
        $facility = $appointment->facility->name;

        if ($event->source === Appointment::SOURCE_STAFF) {
            AppointmentRecipient::notify($appointment, new AppointmentNotification(
                "Appointment confirmed: {$facility}, {$when}",
                ["{$facility} booked an appointment for you on {$when}.", "Reference: {$appointment->reference_code}", 'Please arrive a little early and bring a valid ID.'],
                'View appointment',
                AppointmentRecipient::path($appointment),
            ), 'Appointment booked for you', "{$facility} · {$when}");

            return;
        }

        AppointmentRecipient::notify($appointment, new AppointmentNotification(
            "Request received: {$facility}, {$when}",
            ["We sent your request to {$facility} for {$when}.", "Reference: {$appointment->reference_code}", 'It is not confirmed yet. We will email you when the clinic confirms or declines.'],
            'View appointment',
            AppointmentRecipient::path($appointment),
        ));

        Notification::send($appointment->facility->staff, new AppointmentNotification(
            "New appointment request: {$when}",
            ["A new request is waiting for {$facility} at {$when}.", "Reference: {$appointment->reference_code}"],
            'Review requests',
            '/admin/appointments',
        ));

        Notification::send($appointment->facility->staff, new InAppNotification('appointment', 'New appointment request', "{$facility} · {$when} · {$appointment->reference_code}", '/admin/appointments', ['staff-appointments', 'schedule']));
    }

    public function handleStatusChanged(AppointmentStatusChanged $event): void
    {
        $appointment = $this->load($event->appointmentId);
        if ($appointment === null) {
            return;
        }

        $when = AppointmentRecipient::when($appointment);
        $facility = $appointment->facility->name;
        $reason = $appointment->status_reason ? "Note from the clinic: {$appointment->status_reason}" : null;

        if ($event->byPatient) {
            Notification::send($appointment->facility->staff, new AppointmentNotification(
                "Appointment cancelled by the patient: {$when}",
                ["Reference {$appointment->reference_code} at {$facility} was cancelled by the patient. The seat is open again."],
                'Open appointments',
                '/admin/appointments',
            ));
            Notification::send($appointment->facility->staff, new InAppNotification('appointment', 'Appointment cancelled by patient', "{$facility} · {$when} · {$appointment->reference_code}", '/admin/appointments', ['staff-appointments', 'schedule']));

            return;
        }

        $message = match (AppointmentStatus::from($event->to)) {
            AppointmentStatus::Confirmed => ["Your appointment at {$facility} on {$when} is confirmed.", 'Please arrive a little early and bring a valid ID.', 'At the desk, show the QR code from your appointment page (View appointment), or tell staff your reference code. You will get a queue number.'],
            AppointmentStatus::Declined => ["{$facility} could not accept your request for {$when}.", 'You can choose another time on the facility page.'],
            AppointmentStatus::Cancelled => ["{$facility} cancelled your appointment on {$when}.", 'You can choose another time on the facility page.'],
            default => null,
        };

        if ($message !== null) {
            $title = 'Appointment '.strtolower(AppointmentStatus::from($event->to)->label());
            AppointmentRecipient::notify($appointment, new AppointmentNotification(
                "{$title}: {$facility}",
                array_values(array_filter([...$message, "Reference: {$appointment->reference_code}", $reason])),
                'View appointment',
                AppointmentRecipient::path($appointment),
            ), $title, "{$facility} · {$when}");
        }
    }

    private function load(int $id): ?Appointment
    {
        return Appointment::query()->with(['patient', 'facility.staff'])->find($id);
    }
}
