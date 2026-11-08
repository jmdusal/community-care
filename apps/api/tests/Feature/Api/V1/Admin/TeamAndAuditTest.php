<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use App\Domain\Identity\Notifications\InviteUserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class TeamAndAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_invites_a_member_who_sets_a_password_and_signs_in(): void
    {
        Notification::fake();
        $facility = Facility::factory()->create();
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));
        $this->userWithRole(RoleName::FacilityStaff, ['email' => 'existing@example.org']);

        $this->postJson('/api/v1/admin/users', ['name' => 'Ana Villanueva', 'email' => 'Ana@Example.org', 'roles' => ['facility_staff'], 'facility_ids' => [$facility->public_id]])
            ->assertCreated()
            ->assertJsonPath('data.status', 'invited')
            ->assertJsonPath('data.facilities.0.name', $facility->name);

        $invited = User::query()->where('email', 'ana@example.org')->firstOrFail();
        $token = null;
        Notification::assertSentTo($invited, InviteUserNotification::class, function (InviteUserNotification $notification) use (&$token): bool {
            $token = $notification->token;

            return true;
        });

        $this->postJson('/api/v1/auth/reset-password', ['token' => $token, 'email' => 'ana@example.org', 'password' => 'a-strong-pass-123', 'password_confirmation' => 'a-strong-pass-123'])->assertOk();
        $this->assertSame('active', $invited->refresh()->status);

        $this->postJson('/api/v1/auth/login', ['email' => 'ana@example.org', 'password' => 'a-strong-pass-123', 'device_name' => 'test'])->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.invited', 'resource_id' => $invited->public_id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.invite_accepted']);
    }

    public function test_verifiers_can_view_the_team_but_not_change_it(): void
    {
        $member = $this->userWithRole(RoleName::FacilityStaff);
        Sanctum::actingAs($this->userWithRole(RoleName::Verifier));

        $this->getJson('/api/v1/admin/users')->assertOk()->assertJsonPath('meta.access_review.without_mfa', 2);
        $this->postJson('/api/v1/admin/users', ['name' => 'X', 'email' => 'x@example.org', 'roles' => ['verifier']])->assertForbidden();
        $this->patchJson("/api/v1/admin/users/{$member->public_id}", ['status' => 'suspended'])->assertForbidden();
    }

    public function test_admins_cannot_change_their_own_roles_or_status(): void
    {
        Sanctum::actingAs($admin = $this->userWithRole(RoleName::SystemAdmin));

        $this->patchJson("/api/v1/admin/users/{$admin->public_id}", ['roles' => ['verifier']])->assertConflict();
    }

    public function test_suspending_a_member_revokes_tokens_and_blocks_sign_in(): void
    {
        $member = $this->userWithRole(RoleName::Verifier, ['email' => 'm@example.org', 'password' => 'secret-pass']);
        $member->createToken('phone');
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));

        $this->patchJson("/api/v1/admin/users/{$member->public_id}", ['status' => 'suspended', 'roles' => ['verifier', 'facility_staff']])
            ->assertOk()
            ->assertJsonPath('data.status', 'suspended')
            ->assertJsonPath('data.roles', ['verifier', 'facility_staff']);

        $this->assertSame(0, $member->tokens()->count());
        $this->postJson('/api/v1/auth/login', ['email' => 'm@example.org', 'password' => 'secret-pass', 'device_name' => 'x'])->assertUnprocessable();
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.status_changed']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.roles_changed']);
    }

    public function test_forgot_password_never_reveals_whether_an_account_exists(): void
    {
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.org'])->assertAccepted();
    }

    public function test_audit_log_is_filterable_and_closed_to_facility_staff(): void
    {
        Sanctum::actingAs($admin = $this->userWithRole(RoleName::SystemAdmin));
        $this->patchJson('/api/v1/admin/settings', ['settings' => [['key' => 'api.max_page_size', 'value' => 40]]]);

        $this->getJson('/api/v1/admin/audit-logs?category=settings')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.action', 'settings.updated')
            ->assertJsonPath('data.0.actor', $admin->name)
            ->assertJsonPath('data.0.before', ['value' => 50]);

        $this->getJson('/api/v1/admin/audit-logs?category=facility')->assertJsonPath('meta.total', 0);

        Sanctum::actingAs($this->userWithRole(RoleName::FacilityStaff));
        $this->getJson('/api/v1/admin/audit-logs')->assertForbidden();
    }
}
