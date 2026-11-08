<?php

namespace App\Domain\Booking\Actions;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Events\AppointmentStatusChanged;
use App\Domain\Booking\Exceptions\BookingUnavailable;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Models\AppointmentEvent;
use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Booking\Support\BookingRules;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Moves an appointment along its lifecycle (see AppointmentStatus::allowedNext).
 * Declining or cancelling frees the seat. Patients may only cancel, and only
 * until the cut-off before the appointment.
 */
final class ChangeAppointmentStatus
{
    public function __construct(private readonly BookingRules $rules) {}

    /** $actor is null when a guest acts with their reference code and email. */
    public function handle(Appointment $appointment, AppointmentStatus $to, ?User $actor, ?string $reason = null, bool $byPatient = false): Appointment
    {
        return DB::transaction(function () use ($appointment, $to, $actor, $reason, $byPatient): Appointment {
            $locked = Appointment::query()->whereKey($appointment->id)->lockForUpdate()->firstOrFail();
            $from = $locked->status;

            if (! in_array($to, $from->allowedNext(), true)) {
                throw BookingUnavailable::transition($from->label(), $to->label());
            }

            if ($byPatient) {
                $cutoff = $this->rules->cancelCutoffHours($locked->facility);
                if ($to !== AppointmentStatus::Cancelled) {
                    throw BookingUnavailable::transition($from->label(), $to->label());
                }
                if ($locked->starts_at->lt(now()->addHours($cutoff))) {
                    throw BookingUnavailable::tooLateToCancel($cutoff);
                }
            }

            if ($from->holdsSeat() && ! $to->holdsSeat() && in_array($to, [AppointmentStatus::Declined, AppointmentStatus::Cancelled], true)) {
                $slot = ClinicAvailability::query()->whereKey($locked->availability_id)->lockForUpdate()->first();
                if ($slot !== null && $slot->booked_count > 0) {
                    $slot->decrement('booked_count');
                }
            }

            $locked->update(['status' => $to, 'status_reason' => $reason]);
            AppointmentEvent::query()->create(['appointment_id' => $locked->id, 'actor_id' => $actor?->id, 'from_status' => $from->value, 'to_status' => $to->value, 'note' => $reason, 'created_at' => now()]);
            AppointmentStatusChanged::dispatch($locked->id, $locked->public_id, $from->value, $to->value, $actor?->id, $byPatient);

            return $locked;
        });
    }
}
