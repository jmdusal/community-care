<?php

namespace App\Domain\Booking\Actions;

use App\Domain\Booking\Data\AppointmentContact;
use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Events\AppointmentRequested;
use App\Domain\Booking\Exceptions\BookingUnavailable;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Models\AppointmentEvent;
use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Booking\Support\BookingRules;
use App\Domain\Booking\Support\ReferenceCode;
use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Identity\Models\User;
use App\Domain\Settings\Contracts\SettingsRepository;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/**
 * Takes a seat in a slot, three ways:
 * - online: a signed-in patient requests it (waits for the clinic);
 * - guest: someone without an account, after proving their email with a code (waits for the clinic);
 * - staff: the clinic books a walk-in or phone caller (confirmed straight away).
 *
 * Idempotent: the same key returns the same appointment (safe retries on weak connections).
 * Capacity is enforced under a row lock on the slot, so two people can never take the last seat.
 */
final class RequestAppointment
{
    public function __construct(
        private readonly SettingsRepository $settings,
        private readonly BookingRules $rules,
    ) {}

    /** @return array{0: Appointment, 1: bool} the appointment, and whether it was created now */
    public function handle(User $patient, string $slotPublicId, string $idempotencyKey): array
    {
        $find = fn (): ?Appointment => Appointment::query()->where('patient_id', $patient->id)->where('idempotency_key', $idempotencyKey)->first();

        return $this->once($find, fn (): Appointment => $this->create(
            $slotPublicId,
            AppointmentContact::fromUser($patient),
            $idempotencyKey,
            source: Appointment::SOURCE_ONLINE,
            patient: $patient,
            active: fn (Builder $q) => $q->where('patient_id', $patient->id),
        ));
    }

    /** @return array{0: Appointment, 1: bool} */
    public function forGuest(AppointmentContact $contact, string $slotPublicId, string $idempotencyKey): array
    {
        $find = fn (): ?Appointment => Appointment::query()->where('source', Appointment::SOURCE_GUEST)->where('idempotency_key', $idempotencyKey)->first();

        return $this->once($find, fn (): Appointment => $this->create(
            $slotPublicId,
            $contact,
            $idempotencyKey,
            source: Appointment::SOURCE_GUEST,
            active: fn (Builder $q) => $q->where('contact_email', $contact->email),
        ));
    }

    /**
     * Staff book for a walk-in or phone caller, optionally linked to an existing patient account.
     * The online-booking switches do not apply (the clinic is booking itself), and it is confirmed at once.
     *
     * @return array{0: Appointment, 1: bool}
     */
    public function byStaff(User $staff, AppointmentContact $contact, string $slotPublicId, string $idempotencyKey, ?User $patient = null): array
    {
        $find = fn (): ?Appointment => Appointment::query()->where('source', Appointment::SOURCE_STAFF)->where('booked_by', $staff->id)->where('idempotency_key', $idempotencyKey)->first();

        return $this->once($find, fn (): Appointment => $this->create(
            $slotPublicId,
            $contact,
            $idempotencyKey,
            source: Appointment::SOURCE_STAFF,
            patient: $patient,
            staff: $staff,
            active: $patient === null ? null : fn (Builder $q) => $q->where('patient_id', $patient->id),
        ));
    }

    /**
     * @param  callable(): ?Appointment  $find
     * @param  callable(): Appointment  $create
     * @return array{0: Appointment, 1: bool}
     */
    private function once(callable $find, callable $create): array
    {
        if (($existing = $find()) !== null) {
            return [$existing, false];
        }

        try {
            return [$create(), true];
        } catch (UniqueConstraintViolationException) {
            // A parallel retry with the same key won the race: return its appointment.
            return [$find() ?? throw BookingUnavailable::slotClosed(), false];
        }
    }

    /** @param (callable(Builder<Appointment>): mixed)|null $active narrows "this person's upcoming appointments" */
    private function create(string $slotPublicId, AppointmentContact $contact, string $idempotencyKey, string $source, ?callable $active, ?User $patient = null, ?User $staff = null): Appointment
    {
        return DB::transaction(function () use ($slotPublicId, $contact, $idempotencyKey, $source, $active, $patient, $staff): Appointment {
            $slot = ClinicAvailability::query()->where('public_id', $slotPublicId)->lockForUpdate()->firstOrFail();
            $facility = $slot->facility;

            if ($staff !== null) {
                Gate::forUser($staff)->authorize('manage-schedule', $facility);
            } elseif (! $this->settings->bool('features.booking.enabled') || ! $facility->booking_enabled || $facility->publication_status !== PublicationStatus::Published) {
                throw BookingUnavailable::bookingOff();
            }
            if ($slot->status !== ClinicAvailability::OPEN || $slot->starts_at->lte(now())) {
                throw BookingUnavailable::slotClosed();
            }
            // Online requests follow the facility's rules: enough notice, and not on a closed day.
            if ($staff === null && ($slot->starts_at->lt($this->rules->earliestStart($facility)) || $this->rules->isClosedOn($facility, $slot->starts_at))) {
                throw BookingUnavailable::slotClosed();
            }
            if ($slot->seatsLeft() === 0) {
                throw BookingUnavailable::slotFull();
            }

            if ($active !== null) {
                $upcoming = Appointment::query()->tap($active)
                    ->whereIn('status', [AppointmentStatus::Requested, AppointmentStatus::Confirmed])
                    ->where('starts_at', '>', now());

                if ((clone $upcoming)->where('availability_id', $slot->id)->exists()) {
                    throw BookingUnavailable::alreadyBooked();
                }
                $limit = $this->rules->maxActive($facility);
                if ($staff === null && $upcoming->count() >= $limit) {
                    throw BookingUnavailable::tooMany($limit);
                }
            }

            $slot->increment('booked_count');
            $status = $staff === null ? AppointmentStatus::Requested : AppointmentStatus::Confirmed;

            $appointment = Appointment::query()->create([
                'reference_code' => ReferenceCode::generate(),
                'patient_id' => $patient?->id,
                ...$contact->toAttributes(),
                'facility_id' => $facility->id,
                'service_id' => $slot->service_id,
                'availability_id' => $slot->id,
                'starts_at' => $slot->starts_at,
                'ends_at' => $slot->ends_at,
                'status' => $status,
                'source' => $source,
                'booked_by' => $staff?->id,
                'idempotency_key' => $idempotencyKey,
            ]);

            $actorId = $staff?->id ?? $patient?->id;
            AppointmentEvent::query()->create(['appointment_id' => $appointment->id, 'actor_id' => $actorId, 'from_status' => null, 'to_status' => $status->value, 'note' => $staff === null ? null : 'Booked by the clinic', 'created_at' => now()]);
            AppointmentRequested::dispatch($appointment->id, $appointment->public_id, $facility->public_id, $actorId, $source);

            return $appointment;
        });
    }
}
