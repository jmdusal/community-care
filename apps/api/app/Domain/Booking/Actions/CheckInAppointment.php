<?php

namespace App\Domain\Booking\Actions;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Events\AppointmentCheckedIn;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Models\AppointmentEvent;
use App\Domain\Booking\Models\QueueTicket;
use App\Domain\Booking\Queue\WalkInQueue;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Support\FacilitySnapshot;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Desk check-in: staff scan the patient's QR code (or type the reference code). A confirmed
 * appointment for today at this facility is marked arrived and gets a walk-in queue number,
 * so booked patients and walk-ins are called from one line. Scanning twice is harmless:
 * the second scan returns the number already given.
 */
final class CheckInAppointment
{
    public function __construct(private readonly WalkInQueue $queue) {}

    /** "cc-7kq2-9mxd", "7KQ2-9MXD" and "CC-7KQ2-9MXD" are the same code. */
    public static function normalize(string $code): string
    {
        $code = mb_strtoupper(preg_replace('/\s+/', '', $code) ?? '');

        return str_starts_with($code, 'CC-') ? $code : 'CC-'.$code;
    }

    /** @return array{0: Appointment, 1: QueueTicket, 2: bool} the appointment, its queue number, and whether it was checked in now */
    public function handle(Facility $facility, string $code, User $staff): array
    {
        return DB::transaction(function () use ($facility, $code, $staff): array {
            $appointment = Appointment::query()->where('reference_code', self::normalize($code))->lockForUpdate()->first()
                ?? throw ValidationException::withMessages(['code' => ['No appointment has that reference code. Check the code, or add the person as a walk-in.']]);

            if ($appointment->facility_id !== $facility->id) {
                throw new ConflictHttpException('That appointment is for another facility.');
            }

            $existing = $appointment->queueTicket()->first();
            if ($appointment->arrived_at !== null && $existing !== null) {
                return [$appointment, $existing, false];
            }

            if ($appointment->status !== AppointmentStatus::Confirmed) {
                throw new ConflictHttpException("This appointment is {$appointment->status->label()}, so it cannot be checked in.");
            }

            $timezone = (string) config('communitycare.display_timezone');
            $day = $appointment->starts_at->copy()->setTimezone($timezone);
            if ($day->toDateString() !== FacilitySnapshot::today()) {
                throw new ConflictHttpException('This appointment is on '.$day->format('l, j F Y').', not today.');
            }

            $ticket = $this->queue->issue(
                $facility,
                $staff,
                $appointment->service_id,
                $appointment->contact_name ?? $appointment->patient?->name,
                $appointment->contact_mobile ?? $appointment->patient?->mobile,
                $appointment->id,
            );

            $appointment->update(['arrived_at' => now()]);
            AppointmentEvent::query()->create([
                'appointment_id' => $appointment->id,
                'actor_id' => $staff->id,
                'from_status' => AppointmentStatus::Confirmed->value,
                'to_status' => AppointmentStatus::Confirmed->value,
                'note' => "Arrived, queue number {$ticket->label()}",
                'created_at' => now(),
            ]);
            AppointmentCheckedIn::dispatch($appointment->id, $appointment->public_id, $ticket->label(), $staff->id);

            return [$appointment, $ticket, true];
        });
    }
}
