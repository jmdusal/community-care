<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Domain\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class RegisterTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_patient_signs_up_with_consent_and_a_normalised_mobile_number(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Maria Santos', 'email' => 'Maria@Example.org', 'mobile' => '0917 123 4567',
            'password' => 'a-strong-pass-1', 'password_confirmation' => 'a-strong-pass-1', 'privacy_consent' => true,
        ])->assertCreated()->assertJsonPath('data.user.roles', ['patient']);

        $user = User::query()->where('email', 'maria@example.org')->firstOrFail();
        $this->assertSame('+639171234567', $user->mobile);
        $this->assertNotNull($user->privacy_consent_at);
    }

    public function test_sign_up_requires_consent_a_valid_mobile_and_a_new_email(): void
    {
        User::factory()->create(['email' => 'taken@example.org']);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'X', 'email' => 'taken@example.org', 'mobile' => '12345',
            'password' => 'a-strong-pass-1', 'password_confirmation' => 'a-strong-pass-1',
        ])->assertUnprocessable()->assertJsonValidationErrors(['email', 'mobile', 'privacy_consent'], 'error.fields');
    }

    public function test_patients_cannot_open_the_admin_api(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Pat', 'email' => 'pat@example.org', 'mobile' => '09181234567',
            'password' => 'a-strong-pass-1', 'password_confirmation' => 'a-strong-pass-1', 'privacy_consent' => true,
        ])->assertCreated();

        $this->actingAs(User::query()->where('email', 'pat@example.org')->firstOrFail(), 'sanctum')
            ->getJson('/api/v1/admin/facilities')->assertForbidden();
    }
}
