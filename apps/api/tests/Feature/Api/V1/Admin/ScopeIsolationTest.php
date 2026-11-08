<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Analytics\Models\UsageEvent;
use App\Domain\Audit\Models\AuditLog;
use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Facilities\Enums\ChangeOrigin;
use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityChangeRequest;
use App\Domain\Geography\Models\Region;
use App\Domain\HealthPrograms\Models\HealthProgram;
use App\Domain\Identity\Enums\RoleName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * The top-bar picker promise: when a facility (or region) is selected, every list
 * and every number on the scoped screens comes from that facility (or region) only.
 * All data below lives at facility A, in region 1; facility B (region 2) has none.
 */
final class ScopeIsolationTest extends TestCase
{
    use RefreshDatabase;

    private Facility $busy;

    private Facility $quiet;

    protected function setUp(): void
    {
        parent::setUp();

        $regionWithData = Region::query()->create(['psgc_code' => '0400000000', 'name' => 'Region IV-A']);
        $emptyRegion = Region::query()->create(['psgc_code' => '1000000000', 'name' => 'Region X']);
        $this->busy = Facility::factory()->published()->create(['name' => 'Busy Center', 'region_id' => $regionWithData->id, 'verification_status' => VerificationStatus::Stale, 'booking_enabled' => true]);
        $this->quiet = Facility::factory()->published()->create(['name' => 'Quiet Center', 'region_id' => $emptyRegion->id]);

        $staff = $this->userWithRole(RoleName::FacilityStaff);
        $this->busy->staff()->attach($staff);

        FacilityChangeRequest::query()->create(['facility_id' => $this->busy->id, 'submitted_by' => $staff->id, 'origin' => ChangeOrigin::Edit, 'changes' => ['name' => ['from' => 'A', 'to' => 'B']], 'status' => 'submitted']);

        $slot = ClinicAvailability::query()->create(['facility_id' => $this->busy->id, 'starts_at' => now()->addDay(), 'ends_at' => now()->addDay()->addMinutes(30), 'capacity' => 2, 'booked_count' => 1]);
        Appointment::query()->create(['reference_code' => 'CC-TEST-0001', 'patient_id' => $this->userWithRole(RoleName::Patient)->id, 'facility_id' => $this->busy->id, 'availability_id' => $slot->id, 'starts_at' => $slot->starts_at, 'ends_at' => $slot->ends_at, 'status' => AppointmentStatus::Requested, 'idempotency_key' => 'scope-test-key']);

        HealthProgram::query()->create(['title' => 'Program at A', 'category' => 'immunization', 'summary' => 'S', 'description' => 'D', 'starts_on' => now()->toDateString(), 'status' => 'published'])
            ->facilities()->attach($this->busy);

        AuditLog::query()->create(['event_key' => 'scope-test:1', 'action' => 'facility.updated', 'resource_type' => 'facility', 'resource_id' => $this->busy->public_id, 'created_at' => now()]);
        UsageEvent::query()->create(['event' => UsageEvent::PROFILE_VIEW, 'facility_id' => $this->busy->id, 'region_id' => $regionWithData->id, 'created_at' => now()]);

        Cache::flush();
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));
    }

    /** @return iterable<string, array{0: string}> */
    public static function scopes(): iterable
    {
        yield 'a facility with no data' => ['facility'];
        yield 'a region with no data' => ['region'];
    }

    #[DataProvider('scopes')]
    public function test_every_scoped_screen_shows_only_the_selected_scope(string $kind): void
    {
        $scope = $kind === 'facility' ? 'facility_id='.$this->quiet->public_id : 'region_code=1000000000';

        // Overview
        $this->getJson("/api/v1/admin/stats?{$scope}")
            ->assertOk()
            ->assertJsonPath('data.totals.pending_changes', 0)
            ->assertJsonPath('data.totals.stale', 0)
            ->assertJsonPath('data.usage.profile_views', 0)
            ->assertJsonPath('data.needs_attention', [])
            ->assertJsonPath('data.recent_activity', []);

        // Facilities: the list and the status tab counts
        $this->getJson("/api/v1/admin/facilities?{$scope}")
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Quiet Center')
            ->assertJsonPath('meta.status_counts', ['verified' => 1]);

        // Review queue: the list and the summary numbers
        $this->getJson("/api/v1/admin/change-requests?{$scope}")
            ->assertOk()
            ->assertJsonPath('meta.total', 0)
            ->assertJsonPath('meta.queue.pending_changes', 0)
            ->assertJsonPath('meta.queue.stale_facilities', 0);

        // Appointments: every view count
        $this->getJson("/api/v1/admin/appointments?{$scope}")
            ->assertOk()
            ->assertJsonPath('meta.total', 0)
            ->assertJsonPath('meta.counts', ['requests' => 0, 'upcoming' => 0, 'past' => 0]);

        // Health programs: the list and the status tab counts
        $this->getJson("/api/v1/admin/health-programs?{$scope}")
            ->assertOk()
            ->assertJsonPath('meta.total', 0)
            ->assertJsonPath('meta.status_counts', []);

        // Team: members and the access review numbers
        $this->getJson("/api/v1/admin/users?{$scope}")
            ->assertOk()
            ->assertJsonPath('meta.total', 0)
            ->assertJsonPath('meta.access_review.inactive_45_days', 0);
    }

    public function test_audit_log_shows_only_the_selected_facility(): void
    {
        $this->getJson('/api/v1/admin/audit-logs?resource_type=facility&resource_id='.$this->quiet->public_id)->assertOk()->assertJsonPath('meta.total', 0);
        $this->getJson('/api/v1/admin/audit-logs?resource_type=facility&resource_id='.$this->busy->public_id)->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_the_busy_facility_does_show_its_data(): void
    {
        $scope = 'facility_id='.$this->busy->public_id;

        $this->getJson("/api/v1/admin/stats?{$scope}")->assertJsonPath('data.totals.pending_changes', 1)->assertJsonCount(1, 'data.recent_activity');
        $this->getJson("/api/v1/admin/change-requests?{$scope}")->assertJsonPath('meta.queue.pending_changes', 1)->assertJsonPath('meta.queue.stale_facilities', 1);
        $this->getJson("/api/v1/admin/appointments?{$scope}")->assertJsonPath('meta.counts.requests', 1);
        $this->getJson("/api/v1/admin/health-programs?{$scope}")->assertJsonPath('meta.status_counts.published', 1);
        $this->getJson("/api/v1/admin/users?{$scope}")->assertJsonPath('meta.total', 1);
    }
}
