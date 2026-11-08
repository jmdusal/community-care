<?php

namespace Tests\Feature\Api\V1\Booking;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class CheckInTest extends TestCase
{
    use RefreshDatabase;

    private Facility $facility;

    private User $staff;

    private CarbonImmutable $nine;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo(CarbonImmutable::parse('2026-12-10 08:00', 'Asia/Manila'));
        $this->nine = CarbonImmutable::parse('2026-12-10 09:00', 'Asia/Manila');
        $this->facility = Facility::factory()->published()->create();
        $this->staff = $this->userWithRole(RoleName::FacilityStaff);
        $this->facility->staff()->attach($this->staff);
    }

    public function test_scanning_a_confirmed_appointment_for_today_gives_a_queue_number_once(): void
    {
        $appointment = $this->appointment($this->facility, $this->nine, AppointmentStatus::Confirmed, 'CC-7KQ2-9MXD');
        Sanctum::actingAs($this->staff);
        $url = "/api/v1/admin/facilities/{$this->facility->public_id}/check-in";

        $this->postJson($url, ['code' => 'CC-7KQ2-9MXD'])
            ->assertCreated()
            ->assertJsonPath('data.ticket.number', '001')
            ->assertJsonPath('data.ticket.name', 'Juana Cruz')
            ->assertJsonPath('data.ticket.appointment.reference_code', 'CC-7KQ2-9MXD')
            ->assertJsonPath('data.already_checked_in', false);
        $this->assertNotNull($appointment->fresh()->arrived_at);
        $this->assertDatabaseHas('audit_logs', ['action' => 'appointment.checked_in', 'resource_id' => $appointment->public_id]);

        // Typed without the prefix, or scanned twice: the same number, not a second one.
        $this->postJson($url, ['code' => ' 7kq2-9mxd '])->assertOk()->assertJsonPath('data.ticket.number', '001')->assertJsonPath('data.already_checked_in', true);

        $this->postJson("/api/v1/admin/facilities/{$this->facility->public_id}/queue", [])->assertJsonPath('data.number', '002');
        $this->getJson("/api/v1/admin/facilities/{$this->facility->public_id}/queue")
            ->assertJsonPath('data.0.appointment.reference_code', 'CC-7KQ2-9MXD')
            ->assertJsonPath('data.1.appointment', null);
    }

    public function test_only_confirmed_appointments_for_today_at_this_facility_check_in(): void
    {
        $this->appointment($this->facility, $this->nine, AppointmentStatus::Requested, 'CC-AAAA-0001');
        $this->appointment($this->facility, $this->nine->addDay(), AppointmentStatus::Confirmed, 'CC-AAAA-0002');
        $this->appointment(Facility::factory()->published()->create(), $this->nine, AppointmentStatus::Confirmed, 'CC-AAAA-0003');
        Sanctum::actingAs($this->staff);
        $url = "/api/v1/admin/facilities/{$this->facility->public_id}/check-in";

        $this->postJson($url, ['code' => 'CC-AAAA-0001'])->assertConflict()->assertJsonPath('error.message', 'This appointment is Waiting for the clinic, so it cannot be checked in.');
        $this->postJson($url, ['code' => 'CC-AAAA-0002'])->assertConflict()->assertJsonPath('error.message', 'This appointment is on Friday, 11 December 2026, not today.');
        $this->postJson($url, ['code' => 'CC-AAAA-0003'])->assertConflict();
        $this->postJson($url, ['code' => 'CC-NOPE-NOPE'])->assertUnprocessable()->assertJsonPath('error.fields.code.0', 'No appointment has that reference code. Check the code, or add the person as a walk-in.');
        $this->postJson($url, [])->assertUnprocessable();
        $this->assertDatabaseCount('queue_tickets', 0);
    }

    public function test_staff_of_another_facility_cannot_check_people_in(): void
    {
        $this->appointment($this->facility, $this->nine, AppointmentStatus::Confirmed, 'CC-7KQ2-9MXD');
        Sanctum::actingAs($this->userWithRole(RoleName::FacilityStaff));

        $this->postJson("/api/v1/admin/facilities/{$this->facility->public_id}/check-in", ['code' => 'CC-7KQ2-9MXD'])->assertForbidden();
    }

    public function test_the_patient_sees_a_qr_code_until_they_arrive_then_their_queue_number(): void
    {
        $patient = $this->userWithRole(RoleName::Patient);
        $appointment = $this->appointment($this->facility, $this->nine, AppointmentStatus::Confirmed, 'CC-7KQ2-9MXD', $patient);
        Sanctum::actingAs($patient);

        $qr = $this->getJson("/api/v1/appointments/{$appointment->public_id}")->assertOk()->json('data.check_in_qr');
        $this->assertStringStartsWith('data:image/png;base64,', $qr);

        Sanctum::actingAs($this->staff);
        $this->postJson("/api/v1/admin/facilities/{$this->facility->public_id}/check-in", ['code' => 'CC-7KQ2-9MXD'])->assertCreated();

        Sanctum::actingAs($patient);
        $this->getJson("/api/v1/appointments/{$appointment->public_id}")
            ->assertJsonPath('data.check_in_qr', null)
            ->assertJsonPath('data.queue_number', '001');
    }

    private function appointment(Facility $facility, CarbonImmutable $at, AppointmentStatus $status, string $code, ?User $patient = null): Appointment
    {
        $slot = ClinicAvailability::query()->create(['facility_id' => $facility->id, 'starts_at' => $at, 'ends_at' => $at->addMinutes(30), 'capacity' => 5]);

        return Appointment::query()->create([
            'reference_code' => $code, 'patient_id' => $patient?->id,
            'contact_name' => 'Juana Cruz', 'facility_id' => $facility->id, 'availability_id' => $slot->id,
            'starts_at' => $slot->starts_at, 'ends_at' => $slot->ends_at, 'status' => $status, 'idempotency_key' => uniqid('k', true),
        ]);
    }
}
