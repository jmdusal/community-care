<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use App\Domain\Identity\Notifications\TwoFactorCodeNotification;
use App\Domain\Identity\TwoFactor\TrustedDevices;
use App\Domain\Settings\Contracts\SettingsRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class TrustedDeviceTest extends TestCase
{
    use RefreshDatabase;

    private User $patient;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        // Many sign-ins in a row here; the login rate limit itself is tested elsewhere.
        app(SettingsRepository::class)->write('api.rate_limit.login', 60, null);
        app(SettingsRepository::class)->flush();
        $this->patient = $this->userWithRole(RoleName::Patient, ['email' => 'juana@example.org', 'password' => 'secret-password']);

        // Turn on email codes for the patient.
        Sanctum::actingAs($this->patient);
        $this->postJson('/api/v1/me/two-factor/setup', ['password' => 'secret-password', 'method' => 'email'])->assertOk();
        $this->postJson('/api/v1/me/two-factor/confirm', ['code' => $this->lastCode()])->assertOk();
        $this->app['auth']->forgetGuards();
        Notification::fake();
    }

    public function test_a_remembered_phone_skips_the_code_and_others_still_get_asked(): void
    {
        $token = $this->signInWithCode(remember: true)->assertJsonPath('data.trusted_device.days', 30)->json('data.trusted_device.token');

        // Same phone: password only.
        $this->login(['trusted_device' => $token])->assertOk()->assertJsonPath('data.token_type', 'Bearer')->assertJsonMissingPath('data.two_factor_required');

        // Another phone (or a wrong secret): the code is still needed.
        $this->login([])->assertJsonPath('data.two_factor_required', true);
        $this->login(['trusted_device' => str_repeat('x', 64)])->assertJsonPath('data.two_factor_required', true);

        // Expires after 30 days.
        $this->travel(31)->days();
        $this->login(['trusted_device' => $token])->assertJsonPath('data.two_factor_required', true);
    }

    public function test_not_ticking_remember_gives_no_device_secret(): void
    {
        $this->signInWithCode(remember: false)->assertJsonMissingPath('data.trusted_device');
        $this->assertSame(0, app(TrustedDevices::class)->count($this->patient));
    }

    public function test_changing_the_password_or_forgetting_devices_asks_for_the_code_again(): void
    {
        $token = $this->signInWithCode(remember: true)->json('data.trusted_device.token');
        $bearer = $this->login(['trusted_device' => $token])->json('data.token');

        $this->withToken($bearer)->getJson('/api/v1/me/two-factor')->assertJsonPath('data.remembered_devices', 1);
        $this->withToken($bearer)->deleteJson('/api/v1/me/trusted-devices')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->login(['trusted_device' => $token])->assertJsonPath('data.two_factor_required', true);

        $token = $this->signInWithCode(remember: true)->json('data.trusted_device.token');
        Sanctum::actingAs($this->patient->fresh());
        $this->putJson('/api/v1/me/password', ['current_password' => 'secret-password', 'password' => 'newsecret99', 'password_confirmation' => 'newsecret99'])->assertNoContent();
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/v1/auth/login', ['email' => 'juana@example.org', 'password' => 'newsecret99', 'device_name' => 'phone', 'trusted_device' => $token])->assertJsonPath('data.two_factor_required', true);
    }

    /** @param array<string, string> $extra */
    private function login(array $extra)
    {
        return $this->postJson('/api/v1/auth/login', ['email' => 'juana@example.org', 'password' => 'secret-password', 'device_name' => 'phone', ...$extra]);
    }

    private function signInWithCode(bool $remember)
    {
        Notification::fake();
        // A code from an earlier, unfinished sign-in would be reused; start from a fresh one.
        Cache::forget("two_factor:email:sign_in:{$this->patient->id}");
        $challenge = $this->login([])->assertJsonPath('data.two_factor_required', true)->json('data.challenge');

        return $this->postJson('/api/v1/auth/two-factor', ['challenge' => $challenge, 'code' => $this->lastCode(), 'remember_device' => $remember])->assertOk();
    }

    private function lastCode(): string
    {
        $code = null;
        Notification::assertSentTo($this->patient, TwoFactorCodeNotification::class, function (TwoFactorCodeNotification $n) use (&$code): bool {
            $code = $n->code;

            return true;
        });

        return (string) $code;
    }
}
