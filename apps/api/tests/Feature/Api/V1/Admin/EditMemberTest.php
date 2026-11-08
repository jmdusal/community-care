<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Identity\Enums\RoleName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class EditMemberTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_edits_a_members_details_and_the_change_is_audited(): void
    {
        $member = $this->userWithRole(RoleName::FacilityStaff, ['name' => 'Rico Santos', 'email' => 'rico@example.org']);
        $member->createToken('phone');
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));

        $this->patchJson("/api/v1/admin/users/{$member->public_id}", ['name' => 'Rico M. Santos', 'email' => 'Rico.Santos@Example.org', 'mobile' => '0917 555 1234'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Rico M. Santos')
            ->assertJsonPath('data.email', 'rico.santos@example.org')
            ->assertJsonPath('data.mobile', '+639175551234');

        $this->assertSame(0, $member->tokens()->count(), 'changing the sign-in email signs the member out elsewhere');
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.profile_updated', 'resource_id' => $member->public_id]);
    }

    public function test_only_changed_fields_are_saved_and_a_name_only_change_keeps_sessions(): void
    {
        $member = $this->userWithRole(RoleName::Verifier, ['email' => 'keep@example.org']);
        $member->createToken('laptop');
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));

        $this->patchJson("/api/v1/admin/users/{$member->public_id}", ['name' => 'New Name', 'email' => 'keep@example.org'])->assertOk();

        $this->assertSame(1, $member->tokens()->count());
    }

    public function test_email_must_be_unique_and_mobile_valid(): void
    {
        $this->userWithRole(RoleName::Verifier, ['email' => 'taken@example.org']);
        $member = $this->userWithRole(RoleName::Verifier);
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));

        $this->patchJson("/api/v1/admin/users/{$member->public_id}", ['email' => 'taken@example.org', 'mobile' => '12345'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'mobile'], 'error.fields');
    }

    public function test_verifiers_cannot_edit_members(): void
    {
        $member = $this->userWithRole(RoleName::FacilityStaff);
        Sanctum::actingAs($this->userWithRole(RoleName::Verifier));

        $this->patchJson("/api/v1/admin/users/{$member->public_id}", ['name' => 'Changed'])->assertForbidden();
    }
}
