<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class RoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_system_admin_creates_a_custom_role_and_it_controls_access(): void
    {
        $admin = $this->userWithRole(RoleName::SystemAdmin);
        $facility = Facility::factory()->published()->create();
        $other = Facility::factory()->published()->create();
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/roles', [
            'label' => 'Data encoder',
            'description' => 'Keeps facility details up to date.',
            'scope' => 'assigned',
            'permissions' => ['facilities.view', 'facilities.edit', 'reports.view'],
        ])->assertCreated()->assertJsonPath('data.name', 'data_encoder')->assertJsonPath('data.built_in', false);

        $encoder = User::factory()->create();
        $encoder->roles()->attach(Role::idsFor(['data_encoder']));
        $facility->staff()->attach($encoder);

        Sanctum::actingAs($encoder->fresh());
        $this->getJson('/api/v1/me')->assertJsonPath('data.permissions', ['facilities.edit', 'facilities.view', 'reports.view'])->assertJsonPath('data.sees_all_facilities', false);
        $this->getJson("/api/v1/admin/facilities/{$facility->public_id}")->assertOk();
        $this->getJson("/api/v1/admin/facilities/{$other->public_id}")->assertForbidden();
        $this->getJson('/api/v1/admin/reports')->assertOk();
        $this->getJson('/api/v1/admin/appointments')->assertForbidden();
        $this->getJson('/api/v1/admin/settings')->assertForbidden();
    }

    public function test_editing_a_built_in_role_changes_what_its_members_can_do(): void
    {
        $staff = $this->userWithRole(RoleName::FacilityStaff);
        Sanctum::actingAs($staff);
        $this->getJson('/api/v1/admin/appointments')->assertOk();

        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));
        $this->patchJson('/api/v1/admin/roles/facility_staff', ['permissions' => ['facilities.view', 'facilities.edit']])->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'role.updated', 'resource_id' => 'facility_staff']);

        Sanctum::actingAs($staff->fresh());
        $this->getJson('/api/v1/admin/appointments')->assertForbidden();
    }

    public function test_rules_that_keep_roles_safe(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));

        // System-wide permissions need an all-facilities role.
        $this->postJson('/api/v1/admin/roles', ['label' => 'Local settings', 'scope' => 'assigned', 'permissions' => ['settings.manage']])
            ->assertUnprocessable()->assertJsonValidationErrors(['permissions'], 'error.fields');

        $this->patchJson('/api/v1/admin/roles/system_admin', ['permissions' => []])->assertConflict();
        $this->deleteJson('/api/v1/admin/roles/verifier')->assertConflict();

        $this->postJson('/api/v1/admin/roles', ['label' => 'Auditor', 'scope' => 'all', 'permissions' => ['audit.view']])->assertCreated();
        $auditor = User::factory()->create();
        $auditor->roles()->attach(Role::idsFor(['auditor']));
        $this->deleteJson('/api/v1/admin/roles/auditor')->assertConflict();
        $auditor->roles()->detach();
        $this->deleteJson('/api/v1/admin/roles/auditor')->assertNoContent();
    }

    public function test_nobody_can_give_more_access_than_they_have(): void
    {
        $facility = Facility::factory()->published()->create();
        $facilityAdmin = $this->userWithRole(RoleName::FacilityAdmin);
        $facility->staff()->attach($facilityAdmin);
        Sanctum::actingAs($facilityAdmin);

        // Facility admins cannot edit roles, and can only give assigned roles within their own permissions.
        $this->postJson('/api/v1/admin/roles', ['label' => 'X', 'scope' => 'assigned', 'permissions' => []])->assertForbidden();
        $this->getJson('/api/v1/admin/roles')->assertOk()
            ->assertJsonPath('meta.can_manage', false)
            ->assertJsonFragment(['name' => 'facility_staff', 'grantable' => true])
            ->assertJsonFragment(['name' => 'verifier', 'grantable' => false]);

        $this->postJson('/api/v1/admin/users', ['name' => 'New Admin', 'email' => 'new@example.org', 'roles' => ['facility_admin'], 'facility_ids' => [$facility->public_id]])->assertCreated();
        $this->postJson('/api/v1/admin/users', ['name' => 'Sneaky', 'email' => 'sneaky@example.org', 'roles' => ['verifier'], 'facility_ids' => [$facility->public_id]])->assertForbidden();
    }

    public function test_verifiers_see_roles_but_cannot_change_them(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::Verifier));

        $this->getJson('/api/v1/admin/roles')->assertOk()->assertJsonPath('meta.can_manage', false)->assertJsonCount(19, 'meta.permissions');
        $this->patchJson('/api/v1/admin/roles/facility_staff', ['permissions' => []])->assertForbidden();
    }
}
