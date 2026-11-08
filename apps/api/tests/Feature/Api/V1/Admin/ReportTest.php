<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Analytics\Models\UsageEvent;
use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class ReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_reports_count_appointments_and_directory_use(): void
    {
        $facility = Facility::factory()->published()->create(['name' => 'Pilot Health Center']);
        $this->appointment($facility, AppointmentStatus::Completed, 'online');
        $this->appointment($facility, AppointmentStatus::NoShow, 'guest');
        $this->appointment($facility, AppointmentStatus::Completed, 'staff');
        UsageEvent::query()->create(['event' => UsageEvent::SEARCH, 'created_at' => now()->subDay()]);
        UsageEvent::query()->create(['event' => UsageEvent::CALL_CLICK, 'facility_id' => $facility->id, 'created_at' => now()->subDay()]);
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));

        $this->getJson('/api/v1/admin/reports')
            ->assertOk()
            ->assertJsonPath('data.range.days', 30)
            ->assertJsonPath('data.appointments.total', 3)
            ->assertJsonPath('data.appointments.by_status.completed', 2)
            ->assertJsonPath('data.appointments.by_source.guest', 1)
            ->assertJsonPath('data.appointments.attendance_rate', 0.667)
            ->assertJsonPath('data.appointments.top_facilities.0.name', 'Pilot Health Center')
            ->assertJsonPath('data.usage.totals.search', 1)
            ->assertJsonPath('data.usage.totals.call_click', 1)
            ->assertJsonCount(30, 'data.by_day');
    }

    public function test_facility_admins_report_on_their_facilities_only_and_exports_have_no_contact_details(): void
    {
        $mine = Facility::factory()->published()->create(['name' => 'Mine']);
        $other = Facility::factory()->published()->create(['name' => 'Other']);
        $this->appointment($mine, AppointmentStatus::Completed, 'online');
        $this->appointment($other, AppointmentStatus::Completed, 'online');
        $admin = $this->userWithRole(RoleName::FacilityAdmin);
        $mine->staff()->attach($admin);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/reports')->assertOk()->assertJsonPath('data.appointments.total', 1)->assertJsonPath('data.usage.totals.search', null);
        $this->getJson("/api/v1/admin/reports?facility_id={$other->public_id}")->assertForbidden();

        $csv = $this->get('/api/v1/admin/reports/export?dataset=appointments')->assertOk()->streamedContent();
        $this->assertStringContainsString('reference_code,facility_id,facility,service,starts_at,status,source,requested_at', $csv);
        $this->assertStringContainsString('Mine', $csv);
        $this->assertStringNotContainsString('Other', $csv);
        $this->assertStringNotContainsString('example', $csv);

        $this->get('/api/v1/admin/reports/export?dataset=facilities')->assertOk()->assertDownload();
    }

    public function test_facility_staff_cannot_open_reports(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::FacilityStaff));

        $this->getJson('/api/v1/admin/reports')->assertForbidden();
    }

    private function appointment(Facility $facility, AppointmentStatus $status, string $source): void
    {
        $start = now()->subDays(2);
        $slot = ClinicAvailability::query()->create(['facility_id' => $facility->id, 'starts_at' => $start, 'ends_at' => $start->copy()->addMinutes(30), 'capacity' => 5]);
        Appointment::query()->create([
            'reference_code' => 'CC-'.strtoupper(substr(md5(uniqid('', true)), 0, 4)).'-TEST',
            'contact_name' => 'Juana', 'contact_email' => 'juana@example.org',
            'facility_id' => $facility->id, 'availability_id' => $slot->id, 'starts_at' => $slot->starts_at, 'ends_at' => $slot->ends_at,
            'status' => $status, 'source' => $source, 'idempotency_key' => uniqid('k', true),
        ]);
    }
}
