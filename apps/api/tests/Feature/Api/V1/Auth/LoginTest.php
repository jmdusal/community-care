<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_credentials_return_a_token_and_the_user_with_roles(): void
    {
        $user = $this->userWithRole(RoleName::Verifier, ['email' => 'maria@example.org', 'password' => 'secret-pass']);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'maria@example.org',
            'password' => 'secret-pass',
            'device_name' => 'iPhone',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.token_type', 'Bearer')
            ->assertJsonPath('data.user.id', $user->public_id)
            ->assertJsonPath('data.user.roles', ['verifier'])
            ->assertJsonMissingPath('data.user.password');
        $this->assertNotEmpty($response->json('data.token'));
    }

    public function test_wrong_password_is_rejected_without_saying_which_field_was_wrong(): void
    {
        User::factory()->create(['email' => 'maria@example.org', 'password' => 'secret-pass']);

        $this->postJson('/api/v1/auth/login', ['email' => 'maria@example.org', 'password' => 'nope', 'device_name' => 'web'])
            ->assertUnprocessable()
            ->assertJsonPath('error.fields.email.0', 'These credentials do not match our records.');
    }

    public function test_suspended_users_cannot_sign_in(): void
    {
        User::factory()->create(['email' => 'paolo@example.org', 'password' => 'secret-pass', 'status' => 'suspended']);

        $this->postJson('/api/v1/auth/login', ['email' => 'paolo@example.org', 'password' => 'secret-pass', 'device_name' => 'web'])
            ->assertUnprocessable();
    }

    public function test_login_is_rate_limited_by_the_login_setting(): void
    {
        User::factory()->create(['email' => 'maria@example.org']);

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'maria@example.org', 'password' => 'wrong', 'device_name' => 'web']);
        }

        $this->postJson('/api/v1/auth/login', ['email' => 'maria@example.org', 'password' => 'wrong', 'device_name' => 'web'])
            ->assertTooManyRequests()
            ->assertJsonPath('error.code', 'rate_limited')
            ->assertJsonStructure(['error' => ['retry_after']]);
    }

    public function test_me_returns_the_signed_in_user_and_logout_revokes_the_token(): void
    {
        $user = $this->userWithRole(RoleName::SystemAdmin);
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonPath('data.roles', ['system_admin']);

        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertNoContent();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
