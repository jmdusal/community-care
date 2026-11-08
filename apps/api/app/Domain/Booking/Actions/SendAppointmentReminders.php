<?php

namespace App\Domain\Booking\Actions;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Notifications\AppointmentNotification;
use App\Domain\Booking\Support\AppointmentRecipient;

/**
 * Reminds people of confirmed appointments in the next 24 hours, once each (reminded_at).
 * Runs hourly, so everyone hears about 23–24 hours ahead; appointments confirmed later
 * than that are reminded on the next run.
 */
final class SendAppointmentReminders
{
    /** @return int how many reminders were sent */
    public function handle(): int
    {
        $sent = 0;

        Appointment::query()
            ->with(['patient', 'facility:id,name,address'])
            ->where('status', AppointmentStatus::Confirmed)
            ->whereNull('reminded_at')
            ->whereBetween('starts_at', [now(), now()->addDay()])
            ->orderBy('id')
            ->chunkById(200, function ($appointments) use (&$sent): void {
                foreach ($appointments as $appointment) {
                    // Claim it first, so an overlapping run can never send twice.
                    $claimed = Appointment::query()->whereKey($appointment->id)->whereNull('reminded_at')->update(['reminded_at' => now()]);
                    if ($claimed === 0) {
                        continue;
                    }

                    $when = AppointmentRecipient::when($appointment);
                    $facility = $appointment->facility->name;

                    AppointmentRecipient::notify($appointment, new AppointmentNotification(
                        "Reminder: {$facility}, {$when}",
                        array_values(array_filter([
                            "This is a reminder of your appointment at {$facility} on {$when}.",
                            $appointment->facility->address ? "Address: {$appointment->facility->address}" : null,
                            "Reference: {$appointment->reference_code}",
                            'Please arrive a little early and bring a valid ID. If you cannot come, please cancel so someone else can take the time.',
                        ])),
                        'View appointment',
                        AppointmentRecipient::path($appointment),
                    ), 'Appointment tomorrow', "{$facility} · {$when}");

                    $sent++;
                }
            });

        return $sent;
    }
}
