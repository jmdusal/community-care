<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use App\Domain\Identity\TwoFactor\Totp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class TwoFactorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['communitycare.two_factor.enforced' => true]);
    }

    private function admin(): User
    {
        return $this->userWithRole(RoleName::SystemAdmin, ['email' => 'admin@example.org', 'password' => 'secret-password']);
    }

    /** Sets up 2FA through the API and returns [secret, recovery codes]. */
    private function enrol(User $user): array
    {
        Sanctum::actingAs($user);
        $secret = $this->postJson('/api/v1/me/two-factor/setup', ['password' => 'secret-password'])->assertOk()->json('data.secret');
        $codes = $this->postJson('/api/v1/me/two-factor/confirm', ['code' => Totp::codeAt($secret, Totp::currentStep())])->assertOk()->json('data.recovery_codes');

        return [$secret, $codes];
    }

    public function test_admins_must_set_up_two_factor_before_using_the_admin_api(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/facilities')->assertForbidden()->assertJsonPath('error.code', 'two_factor_setup_required');
        $this->getJson('/api/v1/me')->assertOk()->assertJsonPath('data.two_factor', ['enabled' => false, 'required' => true]);

        $this->enrol($admin);

        $this->getJson('/api/v1/admin/facilities')->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.two_factor_enabled', 'resource_id' => $admin->public_id]);
    }

    public function test_facility_staff_and_patients_are_not_forced(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::FacilityStaff));
        $this->getJson('/api/v1/admin/facilities')->assertOk();
    }

    public function test_a_wrong_code_does_not_turn_it_on(): void
    {
        Sanctum::actingAs($this->admin());
        $this->postJson('/api/v1/me/two-factor/setup', ['password' => 'secret-password'])->assertOk();

        $this->postJson('/api/v1/me/two-factor/confirm', ['code' => '000000'])->assertUnprocessable()->assertJsonValidationErrors(['code'], 'error.fields');
        $this->getJson('/api/v1/me/two-factor')->assertJsonPath('data.enabled', false);
    }

    public function test_token_sign_in_needs_the_code_and_a_code_cannot_be_reused(): void
    {
        $admin = $this->admin();
        [$secret] = $this->enrol($admin);
        $this->app['auth']->forgetGuards();

        $challenge = $this->postJson('/api/v1/auth/login', ['email' => 'admin@example.org', 'password' => 'secret-password', 'device_name' => 'postman'])
            ->assertOk()
            ->assertJsonPath('data.two_factor_required', true)
            ->assertJsonMissingPath('data.token')
            ->json('data.challenge');

        $this->postJson('/api/v1/auth/two-factor', ['challenge' => $challenge, 'code' => '123456'])->assertUnprocessable();

        // The code used during setup is the newest one: wait for the next step's code.
        $code = Totp::codeAt($secret, Totp::currentStep() + 1);
        $this->travel(30)->seconds();
        $this->postJson('/api/v1/auth/two-factor', ['challenge' => $challenge, 'code' => $code])->assertOk()->assertJsonPath('data.token_type', 'Bearer');

        $again = $this->postJson('/api/v1/auth/login', ['email' => 'admin@example.org', 'password' => 'secret-password', 'device_name' => 'postman'])->json('data.challenge');
        $this->postJson('/api/v1/auth/two-factor', ['challenge' => $again, 'code' => $code])->assertUnprocessable();
    }

    public function test_a_recovery_code_works_once(): void
    {
        $admin = $this->admin();
        [, $codes] = $this->enrol($admin);
        $this->app['auth']->forgetGuards();

        $challenge = $this->postJson('/api/v1/auth/login', ['email' => 'admin@example.org', 'password' => 'secret-password', 'device_name' => 'laptop'])->json('data.challenge');
        $this->postJson('/api/v1/auth/two-factor', ['challenge' => $challenge, 'recovery_code' => strtolower($codes[0])])->assertOk();

        $challenge = $this->postJson('/api/v1/auth/login', ['email' => 'admin@example.org', 'password' => 'secret-password', 'device_name' => 'laptop'])->json('data.challenge');
        $this->postJson('/api/v1/auth/two-factor', ['challenge' => $challenge, 'recovery_code' => $codes[0]])->assertUnprocessable();
        $this->assertSame(7, count($admin->refresh()->two_factor_recovery_codes));
    }

    public function test_required_roles_cannot_turn_it_off_but_an_admin_can_reset_a_lost_phone(): void
    {
        $verifier = $this->userWithRole(RoleName::Verifier, ['password' => 'secret-password']);
        $this->enrol($verifier);
        $verifier->createToken('old-phone');

        $this->deleteJson('/api/v1/me/two-factor', ['password' => 'secret-password'])->assertConflict();

        $admin = $this->admin();
        $this->enrol($admin);
        $this->postJson("/api/v1/admin/users/{$verifier->public_id}/two-factor/reset")->assertOk()->assertJsonPath('data.mfa_enabled', false);

        $this->assertFalse($verifier->refresh()->hasTwoFactor());
        $this->assertSame(0, $verifier->tokens()->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.two_factor_reset', 'resource_id' => $verifier->public_id]);
    }

    public function test_setup_needs_the_current_password_and_secrets_are_never_exposed(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/me/two-factor/setup', ['password' => 'wrong'])->assertUnprocessable();
        $this->enrol($admin);

        $me = $this->getJson('/api/v1/me')->getContent();
        $this->assertStringNotContainsString('two_factor_secret', $me);
        $this->assertStringNotContainsString('recovery', $me);
    }
}
