<?php

namespace Tests\Feature\Api\V1\Booking;

use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Booking\Notifications\AppointmentNotification;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use App\Domain\Settings\Contracts\SettingsRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class BookingTest extends TestCase
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

    public function test_staff_generate_slots_and_the_public_sees_open_ones(): void
    {
        Sanctum::actingAs($this->staff);
        $monday = now('Asia/Manila')->next('Monday')->toDateString();

        $this->postJson("/api/v1/admin/facilities/{$this->facility->public_id}/availability", [
            'from_date' => $monday, 'to_date' => $monday, 'weekdays' => [1],
            'start_time' => '08:00', 'end_time' => '10:00', 'slot_minutes' => 30, 'capacity' => 3,
        ])->assertCreated()->assertJsonPath('data.created', 4);

        $this->getJson("/api/v1/facilities/{$this->facility->public_id}/availability")
            ->assertOk()
            ->assertJsonPath('meta.booking_enabled', true)
            ->assertJsonCount(4, 'data')
            ->assertJsonPath('data.0.seats_left', 3)
            ->assertJsonMissingPath('data.0.capacity');
    }

    public function test_the_last_seat_can_only_be_taken_once(): void
    {
        $slot = $this->slot(capacity: 1);

        Sanctum::actingAs($this->patient());
        $this->book($slot, 'first-attempt-key')->assertCreated()->assertJsonPath('data.status.value', 'requested');

        Sanctum::actingAs($this->patient());
        $this->book($slot, 'second-person-key')->assertConflict()->assertJsonPath('error.message', 'That time is now full. Please choose another time.');

        $this->assertSame(1, $slot->refresh()->booked_count);
    }

    public function test_retrying_with_the_same_idempotency_key_returns_the_same_appointment(): void
    {
        $slot = $this->slot(capacity: 5);
        Sanctum::actingAs($this->patient());

        $first = $this->book($slot, 'retry-key-123')->assertCreated()->json('data.reference_code');
        $again = $this->book($slot, 'retry-key-123')->assertOk()->json('data.reference_code');

        $this->assertSame($first, $again);
        $this->assertSame(1, $slot->refresh()->booked_count);
        $this->assertMatchesRegularExpression('/^CC-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/', $first);
    }

    public function test_an_idempotency_key_is_required(): void
    {
        Sanctum::actingAs($this->patient());

        $this->postJson('/api/v1/appointments', ['slot_id' => $this->slot()->public_id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['idempotency_key'], 'error.fields');
    }

    public function test_booking_is_refused_when_the_pilot_or_the_facility_is_off(): void
    {
        $slot = $this->slot();
        Sanctum::actingAs($this->patient());

        $this->facility->update(['booking_enabled' => false]);
        $this->book($slot, 'facility-off-key')->assertConflict();

        $this->facility->update(['booking_enabled' => true]);
        app(SettingsRepository::class)->write('features.booking.enabled', false, null);
        app(SettingsRepository::class)->flush();
        $this->book($slot, 'feature-off-key')->assertConflict();
        $this->getJson("/api/v1/facilities/{$this->facility->public_id}/availability")->assertJsonPath('meta.booking_enabled', false)->assertJsonCount(0, 'data');
    }

    public function test_staff_confirm_and_the_patient_is_emailed_without_medical_details(): void
    {
        $patient = $this->patient();
        Sanctum::actingAs($patient);
        $id = $this->book($this->slot(), 'confirm-flow-key')->json('data.id');

        Notification::assertSentTo($this->staff, AppointmentNotification::class);
        Notification::assertSentTo($patient, AppointmentNotification::class, fn (AppointmentNotification $n) => str_starts_with($n->subjectLine, 'Request received'));

        Sanctum::actingAs($this->staff);
        $this->getJson('/api/v1/admin/appointments?view=requests')
            ->assertOk()
            ->assertJsonPath('meta.counts.requests', 1)
            ->assertJsonPath('data.0.patient.mobile', '+639171234567');

        $this->postJson("/api/v1/admin/appointments/{$id}/confirm")->assertOk()->assertJsonPath('data.status.value', 'confirmed');
        $this->postJson("/api/v1/admin/appointments/{$id}/confirm")->assertConflict();

        Notification::assertSentTo($patient, AppointmentNotification::class, fn (AppointmentNotification $n) => str_contains(implode(' ', $n->lines), 'is confirmed'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'appointment.confirmed', 'resource_id' => $id]);
    }

    public function test_declining_needs_a_reason_and_frees_the_seat(): void
    {
        $slot = $this->slot(capacity: 1);
        Sanctum::actingAs($this->patient());
        $id = $this->book($slot, 'decline-flow-key')->json('data.id');

        Sanctum::actingAs($this->staff);
        $this->postJson("/api/v1/admin/appointments/{$id}/decline")->assertUnprocessable();
        $this->postJson("/api/v1/admin/appointments/{$id}/decline", ['reason' => 'Doctor unavailable'])->assertOk();

        $this->assertSame(0, $slot->refresh()->booked_count);
    }

    public function test_patients_cancel_their_own_until_the_cutoff_only(): void
    {
        $this->facility->update(['booking_min_notice_hours' => 0]);
        $patient = $this->patient();
        Sanctum::actingAs($patient);
        $soon = $this->book($this->slot(startsInHours: 1), 'soon-slot-key')->json('data.id');
        $later = $this->book($this->slot(startsInHours: 48), 'later-slot-key')->json('data.id');

        $this->postJson("/api/v1/appointments/{$soon}/cancel")->assertConflict();
        $this->postJson("/api/v1/appointments/{$later}/cancel")->assertOk()->assertJsonPath('data.status.value', 'cancelled');

        Sanctum::actingAs($this->patient());
        $this->getJson("/api/v1/appointments/{$soon}")->assertForbidden();
        $this->postJson("/api/v1/appointments/{$soon}/cancel")->assertForbidden();
    }

    public function test_staff_only_see_their_facilities_and_verifiers_see_no_patient_details(): void
    {
        Sanctum::actingAs($this->patient());
        $id = $this->book($this->slot(), 'scope-check-key')->json('data.id');

        $otherStaff = $this->userWithRole(RoleName::FacilityStaff);
        Facility::factory()->published()->create()->staff()->attach($otherStaff);
        Sanctum::actingAs($otherStaff);
        $this->getJson('/api/v1/admin/appointments')->assertOk()->assertJsonPath('meta.total', 0);
        $this->postJson("/api/v1/admin/appointments/{$id}/confirm")->assertForbidden();
        $this->postJson("/api/v1/admin/facilities/{$this->facility->public_id}/availability", [])->assertForbidden();

        Sanctum::actingAs($this->userWithRole(RoleName::Verifier));
        $this->getJson('/api/v1/admin/appointments')->assertForbidden();
    }

    public function test_patients_are_limited_to_a_number_of_active_requests(): void
    {
        app(SettingsRepository::class)->write('booking.max_active_per_patient', 1, null);
        app(SettingsRepository::class)->flush();
        Sanctum::actingAs($this->patient());

        $this->book($this->slot(startsInHours: 24), 'limit-first-key')->assertCreated();
        $this->book($this->slot(startsInHours: 26), 'limit-second-key')->assertConflict();
    }

    public function test_a_slot_with_bookings_cannot_be_removed(): void
    {
        $slot = $this->slot();
        Sanctum::actingAs($this->patient());
        $this->book($slot, 'remove-slot-key');

        Sanctum::actingAs($this->staff);
        $this->deleteJson("/api/v1/admin/availability/{$slot->public_id}")->assertConflict();
        $this->deleteJson("/api/v1/admin/availability/{$this->slot(startsInHours: 30)->public_id}")->assertNoContent();
    }

    public function test_only_system_admins_opt_facilities_into_the_pilot(): void
    {
        Sanctum::actingAs($this->staff);
        $this->patchJson("/api/v1/admin/facilities/{$this->facility->public_id}/booking", ['enabled' => false])->assertForbidden();

        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));
        $this->patchJson("/api/v1/admin/facilities/{$this->facility->public_id}/booking", ['enabled' => false])->assertOk()->assertJsonPath('data.booking_enabled', false);
        $this->assertDatabaseHas('audit_logs', ['action' => 'facility.booking_disabled', 'resource_id' => $this->facility->public_id]);
    }

    private function patient(): User
    {
        return $this->userWithRole(RoleName::Patient, ['mobile' => '+639171234567']);
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

    private function book(ClinicAvailability $slot, string $key): TestResponse
    {
        return $this->withHeader('Idempotency-Key', $key)->postJson('/api/v1/appointments', ['slot_id' => $slot->public_id]);
    }
}
