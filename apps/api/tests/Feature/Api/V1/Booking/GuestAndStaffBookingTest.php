<?php

namespace Tests\Feature\Api\V1\Booking;

use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Booking\Notifications\AppointmentNotification;
use App\Domain\Booking\Notifications\GuestBookingCodeNotification;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use App\Domain\Settings\Contracts\SettingsRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class GuestAndStaffBookingTest extends TestCase
{
    use RefreshDatabase;

    private Facility $facility;

    private User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        app(SettingsRepository::class)->write('features.booking.enabled', true, null);
        app(SettingsRepository::class)->flush();

        $this->facility = Facility::factory()->published()->create(['name' => 'Pilot Health Center', 'booking_enabled' => true]);
        $this->staff = $this->userWithRole(RoleName::FacilityStaff);
        $this->facility->staff()->attach($this->staff);
    }

    public function test_a_guest_books_with_an_email_code_and_manages_it_with_the_reference(): void
    {
        $slot = $this->slot();

        $verification = $this->startGuest($slot)
            ->assertAccepted()
            ->assertJsonPath('data.sent_to', 'ju***@example.org')
            ->json('data.verification_id');

        $code = $this->sentCode('juana@example.org');

        $this->postJson('/api/v1/appointments/guest/verify', ['verification_id' => $verification, 'code' => '000000'])->assertUnprocessable();

        $reference = $this->postJson('/api/v1/appointments/guest/verify', ['verification_id' => $verification, 'code' => $code])
            ->assertCreated()
            ->assertJsonPath('data.status.value', 'requested')
            ->assertJsonPath('data.source', 'guest')
            ->json('data.reference_code');

        // A retry after a dropped connection returns the same appointment.
        $this->postJson('/api/v1/appointments/guest/verify', ['verification_id' => $verification, 'code' => $code])->assertOk()->assertJsonPath('data.reference_code', $reference);
        $this->assertSame(1, $slot->refresh()->booked_count);

        $appointment = Appointment::query()->where('reference_code', $reference)->firstOrFail();
        $this->assertNull($appointment->patient_id);
        $this->assertSame('+639171234567', $appointment->contact_mobile);
        Notification::assertSentTo($this->staff, AppointmentNotification::class);
        Notification::assertSentOnDemand(AppointmentNotification::class, fn (AppointmentNotification $n, array $channels, AnonymousNotifiable $to) => $to->routes['mail'] === 'juana@example.org' && str_contains($n->path, '/appointments/manage?ref='));

        // Lookup needs both the reference and the email; the short form without "CC-" works too.
        $this->postJson('/api/v1/appointments/lookup', ['reference_code' => $reference, 'email' => 'someone@else.org'])->assertNotFound();
        $this->postJson('/api/v1/appointments/lookup', ['reference_code' => substr($reference, 3), 'email' => 'JUANA@example.org'])->assertOk()->assertJsonPath('data.reference_code', $reference);

        $this->postJson('/api/v1/appointments/lookup/cancel', ['reference_code' => $reference, 'email' => 'juana@example.org'])->assertOk()->assertJsonPath('data.status.value', 'cancelled');
        $this->assertSame(0, $slot->refresh()->booked_count);
    }

    public function test_a_guest_is_emailed_when_the_clinic_confirms_or_declines(): void
    {
        $verification = $this->startGuest($this->slot())->json('data.verification_id');
        $id = $this->postJson('/api/v1/appointments/guest/verify', ['verification_id' => $verification, 'code' => $this->sentCode('juana@example.org')])->json('data.id');

        Sanctum::actingAs($this->staff);
        $this->postJson("/api/v1/admin/appointments/{$id}/confirm")->assertOk()->assertJsonPath('data.status.value', 'confirmed');

        Notification::assertSentOnDemand(AppointmentNotification::class, fn (AppointmentNotification $n, array $c, AnonymousNotifiable $to) => $to->routes['mail'] === 'juana@example.org'
            && $n->subjectLine === 'Appointment confirmed: Pilot Health Center'
            && str_contains($n->path, '/appointments/manage?ref='));

        $declineVerification = $this->startGuest($this->slot(startsInHours: 30))->json('data.verification_id');
        $declined = $this->postJson('/api/v1/appointments/guest/verify', ['verification_id' => $declineVerification, 'code' => $this->sentCode('juana@example.org')])->json('data.id');
        $this->postJson("/api/v1/admin/appointments/{$declined}/decline", ['reason' => 'Doctor on leave'])->assertOk();

        Notification::assertSentOnDemand(AppointmentNotification::class, fn (AppointmentNotification $n) => str_starts_with($n->subjectLine, 'Appointment declined by the clinic')
            && in_array('Note from the clinic: Doctor on leave', $n->lines, true));
    }

    public function test_guest_booking_follows_the_pilot_switch_and_the_active_limit(): void
    {
        $this->facility->update(['booking_enabled' => false]);
        $this->startGuest($this->slot())->assertConflict();
        $this->facility->update(['booking_enabled' => true]);

        app(SettingsRepository::class)->write('booking.max_active_per_patient', 1, null);
        app(SettingsRepository::class)->flush();

        $first = $this->startGuest($this->slot(startsInHours: 30))->json('data.verification_id');
        $this->postJson('/api/v1/appointments/guest/verify', ['verification_id' => $first, 'code' => $this->sentCode('juana@example.org')])->assertCreated();

        $second = $this->startGuest($this->slot(startsInHours: 40))->json('data.verification_id');
        $this->postJson('/api/v1/appointments/guest/verify', ['verification_id' => $second, 'code' => $this->sentCode('juana@example.org')])->assertConflict();
    }

    public function test_staff_book_a_walk_in_and_it_is_confirmed_at_once(): void
    {
        $slot = $this->slot(capacity: 1);
        Sanctum::actingAs($this->staff);

        $this->staffBook($slot, ['name' => 'Pedro Cruz'], 'walk-in-key-1')->assertUnprocessable()->assertJsonValidationErrors(['mobile'], 'error.fields');

        $this->staffBook($slot, ['name' => 'Pedro Cruz', 'mobile' => '0918 765 4321'], 'walk-in-key-1')
            ->assertCreated()
            ->assertJsonPath('data.status.value', 'confirmed')
            ->assertJsonPath('data.source', 'staff')
            ->assertJsonPath('data.patient.name', 'Pedro Cruz')
            ->assertJsonPath('data.patient.mobile', '+639187654321')
            ->assertJsonPath('data.booked_by', $this->staff->name);

        $this->staffBook($slot, ['name' => 'Pedro Cruz', 'mobile' => '09187654321'], 'walk-in-key-1')->assertOk();
        $this->staffBook($slot, ['name' => 'Someone Else', 'mobile' => '09180000000'], 'walk-in-key-2')->assertConflict();
        $this->assertSame(1, $slot->refresh()->booked_count);
    }

    public function test_staff_can_book_for_an_existing_patient_account_who_is_then_notified(): void
    {
        $patient = $this->userWithRole(RoleName::Patient, ['name' => 'Maria Santos', 'mobile' => '+639171112222']);
        Sanctum::actingAs($this->staff);

        $this->staffBook($this->slot(), ['patient' => $patient->public_id], 'for-patient-key')
            ->assertCreated()
            ->assertJsonPath('data.patient.name', 'Maria Santos')
            ->assertJsonPath('data.patient.account_id', $patient->public_id);

        Notification::assertSentTo($patient, AppointmentNotification::class, fn (AppointmentNotification $n) => str_starts_with($n->subjectLine, 'Appointment confirmed'));
        Notification::assertNotSentTo($this->staff, AppointmentNotification::class);

        // Giving the email of an existing account links it as well.
        $this->staffBook($this->slot(startsInHours: 30), ['name' => 'Maria Santos', 'email' => strtoupper($patient->email)], 'by-email-key')
            ->assertCreated()
            ->assertJsonPath('data.patient.account_id', $patient->public_id);

        Sanctum::actingAs($patient);
        $this->getJson('/api/v1/me/appointments')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_staff_cannot_book_at_a_facility_they_are_not_assigned_to(): void
    {
        $other = Facility::factory()->published()->create();
        $slot = ClinicAvailability::query()->create(['facility_id' => $other->id, 'starts_at' => now()->addDay(), 'ends_at' => now()->addDay()->addMinutes(30), 'capacity' => 2]);
        Sanctum::actingAs($this->staff);

        $this->withHeader('Idempotency-Key', 'not-mine-key')
            ->postJson("/api/v1/admin/facilities/{$other->public_id}/appointments", ['slot_id' => $slot->public_id, 'name' => 'Pedro', 'mobile' => '09187654321'])
            ->assertForbidden();
    }

    private function startGuest(ClinicAvailability $slot): TestResponse
    {
        return $this->postJson('/api/v1/appointments/guest', [
            'slot_id' => $slot->public_id,
            'name' => 'Juana Dela Cruz',
            'email' => 'Juana@Example.org',
            'mobile' => '0917 123 4567',
            'privacy_consent' => true,
        ]);
    }

    private function sentCode(string $email): string
    {
        $code = null;
        Notification::assertSentOnDemand(GuestBookingCodeNotification::class, function (GuestBookingCodeNotification $n, array $channels, AnonymousNotifiable $to) use ($email, &$code): bool {
            $code = $n->code;

            return $to->routes['mail'] === $email;
        });

        return (string) $code;
    }

    /** @param array<string, string> $input */
    private function staffBook(ClinicAvailability $slot, array $input, string $key): TestResponse
    {
        return $this->withHeader('Idempotency-Key', $key)->postJson("/api/v1/admin/facilities/{$this->facility->public_id}/appointments", ['slot_id' => $slot->public_id, ...$input]);
    }

    private function slot(int $capacity = 2, int $startsInHours = 24): ClinicAvailability
    {
        return ClinicAvailability::query()->create([
            'facility_id' => $this->facility->id,
            'starts_at' => now()->addHours($startsInHours),
            'ends_at' => now()->addHours($startsInHours)->addMinutes(30),
            'capacity' => $capacity,
        ]);
    }
}
