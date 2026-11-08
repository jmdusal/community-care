<?php

namespace Tests\Feature\Api\V1\Booking;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class AppointmentCalendarTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_calendar_lists_a_months_appointments_the_person_may_see(): void
    {
        $mine = Facility::factory()->published()->create();
        $other = Facility::factory()->published()->create();
        $staff = $this->userWithRole(RoleName::FacilityStaff);
        $mine->staff()->attach($staff);

        $inMonth = CarbonImmutable::parse('2026-12-10 09:00', 'Asia/Manila');
        $this->appointment($mine, $inMonth, AppointmentStatus::Confirmed, 'Juana');
        $this->appointment($mine, $inMonth->addDays(5), AppointmentStatus::Requested, 'Pedro');
        $this->appointment($mine, $inMonth->addMonth(), AppointmentStatus::Confirmed, 'Next Month');
        $this->appointment($other, $inMonth, AppointmentStatus::Confirmed, 'Elsewhere');
        Sanctum::actingAs($staff);

        $this->getJson('/api/v1/admin/appointments/calendar?month=2026-12')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.patient.name', 'Juana')
            ->assertJsonPath('data.1.status.value', 'requested')
            ->assertJsonPath('meta.total', 2);

        $this->getJson('/api/v1/admin/appointments/calendar?month=bad')->assertUnprocessable();
    }

    private function appointment(Facility $facility, CarbonImmutable $at, AppointmentStatus $status, string $name): void
    {
        $slot = ClinicAvailability::query()->create(['facility_id' => $facility->id, 'starts_at' => $at, 'ends_at' => $at->addMinutes(30), 'capacity' => 5]);
        Appointment::query()->create([
            'reference_code' => 'CC-'.strtoupper(substr(md5(uniqid('', true)), 0, 4)).'-CAL1',
            'contact_name' => $name, 'facility_id' => $facility->id, 'availability_id' => $slot->id,
            'starts_at' => $slot->starts_at, 'ends_at' => $slot->ends_at, 'status' => $status, 'idempotency_key' => uniqid('k', true),
        ]);
    }
}
