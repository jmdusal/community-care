<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Audit\Models\AuditLog;
use App\Domain\Facilities\Enums\ChangeOrigin;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityChangeRequest;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class FacilityAdminRoleTest extends TestCase
{
    use RefreshDatabase;

    private Facility $mine;

    private Facility $other;

    private User $facilityAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->mine = Facility::factory()->published()->create(['name' => 'My Health Center']);
        $this->other = Facility::factory()->published()->create(['name' => 'Someone Else Center']);
        $this->facilityAdmin = $this->userWithRole(RoleName::FacilityAdmin);
        $this->mine->staff()->attach($this->facilityAdmin);
    }

    private function proposal(Facility $facility, User $by): FacilityChangeRequest
    {
        return FacilityChangeRequest::query()->create(['facility_id' => $facility->id, 'submitted_by' => $by->id, 'origin' => ChangeOrigin::Edit, 'changes' => ['name' => ['before' => $facility->name, 'after' => $facility->name.' (renamed)']], 'status' => 'submitted']);
    }

    public function test_a_system_admins_edit_goes_live_at_once_but_a_verifiers_waits(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));
        $this->patchJson("/api/v1/admin/facilities/{$this->mine->public_id}", ['name' => 'Renamed by admin'])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');
        $this->assertSame('Renamed by admin', $this->mine->refresh()->name);
        $this->assertDatabaseHas('audit_logs', ['action' => 'facility.approved', 'resource_id' => $this->mine->public_id]);

        Sanctum::actingAs($this->userWithRole(RoleName::Verifier));
        $this->patchJson("/api/v1/admin/facilities/{$this->other->public_id}", ['name' => 'Renamed by verifier'])->assertStatus(202)->assertJsonPath('data.status', 'submitted');
        $this->assertSame('Someone Else Center', $this->other->refresh()->name);
    }

    public function test_facility_admins_run_their_own_facility_only(): void
    {
        $staff = $this->userWithRole(RoleName::FacilityStaff);
        $this->mine->staff()->attach($staff);
        $atMine = $this->proposal($this->mine, $staff);
        $atOther = $this->proposal($this->other, $this->userWithRole(RoleName::FacilityStaff));
        Sanctum::actingAs($this->facilityAdmin);

        $this->getJson('/api/v1/admin/facilities')->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.name', 'My Health Center');
        $this->postJson("/api/v1/admin/change-requests/{$atMine->public_id}/approve")->assertOk();
        $this->postJson("/api/v1/admin/change-requests/{$atOther->public_id}/approve")->assertForbidden();
        $this->postJson("/api/v1/admin/facilities/{$this->mine->public_id}/reverify", ['method' => 'phone_call'])->assertOk();
        $this->postJson("/api/v1/admin/facilities/{$this->other->public_id}/reverify", ['method' => 'phone_call'])->assertForbidden();
        $this->patchJson("/api/v1/admin/facilities/{$this->mine->public_id}/booking", ['enabled' => true])->assertOk();
        $this->patchJson("/api/v1/admin/facilities/{$this->other->public_id}/booking", ['enabled' => true])->assertForbidden();
    }

    public function test_facility_admins_cannot_approve_their_own_edit(): void
    {
        Sanctum::actingAs($this->facilityAdmin);
        $own = $this->proposal($this->mine, $this->facilityAdmin);

        $this->postJson("/api/v1/admin/change-requests/{$own->public_id}/approve")->assertConflict();
    }

    public function test_platform_screens_stay_closed_to_facility_admins(): void
    {
        Sanctum::actingAs($this->facilityAdmin);

        $this->postJson('/api/v1/admin/facilities', ['name' => 'New Clinic'])->assertForbidden();
        $this->getJson('/api/v1/admin/settings')->assertForbidden();
        $this->getJson('/api/v1/admin/import-batches')->assertForbidden();
        $this->getJson('/api/v1/admin/health-programs')->assertForbidden();
        $this->getJson('/api/v1/admin/assistant/overview')->assertForbidden();
    }

    public function test_facility_admins_manage_only_staff_at_their_facilities(): void
    {
        $verifier = $this->userWithRole(RoleName::Verifier);
        $this->mine->staff()->attach($verifier);
        $twoPlaces = $this->userWithRole(RoleName::FacilityStaff);
        $twoPlaces->facilities()->attach([$this->mine->id, $this->other->id]);
        $elsewhere = $this->userWithRole(RoleName::FacilityStaff);
        $this->other->staff()->attach($elsewhere);
        Sanctum::actingAs($this->facilityAdmin);

        $list = collect($this->getJson('/api/v1/admin/users')->assertOk()->json('data'));
        $this->assertFalse($list->contains('id', $elsewhere->public_id), 'staff of other facilities are not listed');
        $this->assertFalse($list->firstWhere('id', $verifier->public_id)['can_edit']);
        $this->assertTrue($list->firstWhere('id', $twoPlaces->public_id)['can_edit']);

        // Invite: facility staff, own facility only.
        $this->postJson('/api/v1/admin/users', ['name' => 'New Nurse', 'email' => 'nurse@example.org', 'roles' => ['facility_staff'], 'facility_ids' => [$this->mine->public_id]])->assertCreated();
        $this->postJson('/api/v1/admin/users', ['name' => 'X', 'email' => 'x@example.org', 'roles' => ['verifier'], 'facility_ids' => [$this->mine->public_id]])->assertForbidden();
        $this->postJson('/api/v1/admin/users', ['name' => 'Y', 'email' => 'y@example.org', 'roles' => ['facility_staff'], 'facility_ids' => [$this->other->public_id]])->assertForbidden();

        // Cannot touch a verifier; editing two-place staff keeps the other facility.
        $this->patchJson("/api/v1/admin/users/{$verifier->public_id}", ['name' => 'Hacked'])->assertForbidden();
        $this->patchJson("/api/v1/admin/users/{$twoPlaces->public_id}", ['facility_ids' => [$this->mine->public_id]])->assertOk();
        $this->assertEqualsCanonicalizing([$this->mine->id, $this->other->id], $twoPlaces->refresh()->facilities->pluck('id')->all());
    }

    public function test_facility_admins_see_only_their_facilities_in_the_audit_log(): void
    {
        AuditLog::query()->create(['event_key' => 'k1', 'action' => 'facility.updated', 'resource_type' => 'facility', 'resource_id' => $this->mine->public_id, 'created_at' => now()]);
        AuditLog::query()->create(['event_key' => 'k2', 'action' => 'facility.updated', 'resource_type' => 'facility', 'resource_id' => $this->other->public_id, 'created_at' => now()]);
        AuditLog::query()->create(['event_key' => 'k3', 'action' => 'settings.updated', 'resource_type' => 'setting', 'resource_id' => 'x', 'created_at' => now()]);
        Sanctum::actingAs($this->facilityAdmin);

        $this->getJson('/api/v1/admin/audit-logs')->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.resource_id', $this->mine->public_id);
    }

    public function test_facility_admins_must_use_two_factor(): void
    {
        config(['communitycare.two_factor.enforced' => true]);
        Sanctum::actingAs($this->facilityAdmin);

        $this->getJson('/api/v1/admin/facilities')->assertForbidden()->assertJsonPath('error.code', 'two_factor_setup_required');
    }
}
