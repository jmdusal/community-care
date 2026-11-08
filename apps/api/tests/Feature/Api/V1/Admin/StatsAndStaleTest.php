<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Analytics\Models\UsageEvent;
use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Settings\Contracts\SettingsRepository;
use App\Domain\Settings\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class StatsAndStaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_stale_rule_follows_the_setting(): void
    {
        $old = Facility::factory()->published()->create(['verified_at' => now()->subDays(200)]);
        $recent = Facility::factory()->published()->create(['verified_at' => now()->subDays(100)]);

        $this->artisan('communitycare:mark-stale')->expectsOutput('1 facilities marked stale.')->assertSuccessful();
        $this->assertSame(VerificationStatus::Stale, $old->refresh()->verification_status);
        $this->assertSame(VerificationStatus::Verified, $recent->refresh()->verification_status);

        Setting::query()->create(['key' => 'verification.stale_after_days', 'value' => 90]);
        app(SettingsRepository::class)->flush();
        $this->artisan('communitycare:mark-stale')->expectsOutput('1 facilities marked stale.');
        $this->assertSame(VerificationStatus::Stale, $recent->refresh()->verification_status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'facility.marked_stale']);
    }

    public function test_admin_overview_counts_come_from_the_data(): void
    {
        Facility::factory()->published()->count(3)->create();
        Facility::factory()->create(['verification_status' => VerificationStatus::Stale]);
        $facility = Facility::query()->first();
        UsageEvent::query()->insert([
            ['event' => 'search', 'facility_id' => null, 'created_at' => now()],
            ['event' => 'search', 'facility_id' => null, 'created_at' => now()],
            ['event' => 'profile_view', 'facility_id' => $facility->id, 'created_at' => now()],
        ]);

        Sanctum::actingAs($this->userWithRole(RoleName::Verifier));

        $this->getJson('/api/v1/admin/stats?days=7')
            ->assertOk()
            ->assertJsonPath('data.scope.type', 'all')
            ->assertJsonPath('data.totals.facilities', 4)
            ->assertJsonPath('data.totals.published', 3)
            ->assertJsonPath('data.totals.stale', 1)
            ->assertJsonPath('data.usage.searches', 2)
            ->assertJsonPath('data.usage.search_to_profile_pct', 50)
            ->assertJsonCount(7, 'data.usage.series');
    }

    public function test_facility_staff_only_get_stats_for_their_assigned_facility(): void
    {
        $mine = Facility::factory()->published()->create();
        $other = Facility::factory()->published()->create();
        $staff = $this->userWithRole(RoleName::FacilityStaff);
        $staff->facilities()->attach($mine->id);
        Sanctum::actingAs($staff);

        // Nothing chosen: all of their assigned facilities (here, one).
        $this->getJson('/api/v1/admin/stats')->assertOk()->assertJsonPath('data.totals.facilities', 1);
        $this->getJson("/api/v1/admin/stats?facility_id={$other->public_id}")->assertForbidden();
        $this->getJson("/api/v1/admin/stats?facility_id={$mine->public_id},{$other->public_id}")->assertForbidden();
        $this->getJson("/api/v1/admin/stats?facility_id={$mine->public_id}")
            ->assertOk()
            ->assertJsonPath('data.scope.type', 'facility')
            ->assertJsonPath('data.totals.facilities', 1);

        $this->getJson('/api/v1/me')->assertJsonPath('data.facilities.0.id', $mine->public_id);
    }

    public function test_the_sign_in_response_includes_assigned_facilities(): void
    {
        $facility = Facility::factory()->published()->create();
        $staff = $this->userWithRole(RoleName::FacilityStaff, ['email' => 'rico@example.org', 'password' => 'secret-password']);
        $staff->facilities()->attach($facility->id);

        $this->postJson('/api/v1/auth/login', ['email' => 'rico@example.org', 'password' => 'secret-password', 'device_name' => 'phone'])
            ->assertOk()
            ->assertJsonPath('data.user.facilities.0.id', $facility->public_id)
            ->assertJsonPath('data.user.permissions', ['appointments.manage', 'facilities.edit', 'facilities.view', 'patients.view']);
    }

    public function test_several_facilities_can_be_chosen_at_once(): void
    {
        $first = Facility::factory()->published()->create();
        $second = Facility::factory()->published()->create();
        Facility::factory()->published()->create();
        $admin = $this->userWithRole(RoleName::FacilityAdmin);
        $admin->facilities()->attach([$first->id, $second->id]);
        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/admin/stats?facility_id={$first->public_id},{$second->public_id}")
            ->assertOk()
            ->assertJsonPath('data.scope.type', 'facilities')
            ->assertJsonPath('data.totals.facilities', 2);
        $this->getJson("/api/v1/admin/facilities?facility_id={$first->public_id},{$second->public_id}")->assertOk()->assertJsonCount(2, 'data');
        $this->getJson("/api/v1/admin/facilities?facility_id={$first->public_id}")->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_someone_with_no_assigned_facility_sees_no_numbers(): void
    {
        Facility::factory()->published()->create();
        Sanctum::actingAs($this->userWithRole(RoleName::FacilityStaff));

        $this->getJson('/api/v1/admin/stats')->assertForbidden();
    }
}
