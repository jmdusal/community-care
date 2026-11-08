<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use App\Domain\Identity\Notifications\TwoFactorCodeNotification;
use App\Domain\Settings\Contracts\SettingsRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class EmailTwoFactorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['communitycare.two_factor.enforced' => true]);
        Notification::fake();
    }

    private function lastCode(User $user): string
    {
        $code = null;
        Notification::assertSentTo($user, TwoFactorCodeNotification::class, function (TwoFactorCodeNotification $n) use (&$code): bool {
            $code = $n->code;

            return true;
        });

        return (string) $code;
    }

    private function enrolByEmail(User $user): void
    {
        Sanctum::actingAs($user);
        $this->postJson('/api/v1/me/two-factor/setup', ['password' => 'secret-password', 'method' => 'email'])
            ->assertOk()
            ->assertJsonPath('data.method', 'email')
            ->assertJsonPath('data.sent_to', 'ma*****@example.org')
            ->assertJsonMissingPath('data.secret');

        $this->postJson('/api/v1/me/two-factor/confirm', ['code' => $this->lastCode($user)])->assertOk()->assertJsonCount(8, 'data.recovery_codes');
        $this->app['auth']->forgetGuards();
    }

    public function test_set_up_and_sign_in_with_codes_sent_by_email(): void
    {
        $admin = $this->userWithRole(RoleName::SystemAdmin, ['email' => 'maria.admin@example.org', 'password' => 'secret-password']);
        $this->enrolByEmail($admin);
        Notification::fake();

        $challenge = $this->postJson('/api/v1/auth/login', ['email' => 'maria.admin@example.org', 'password' => 'secret-password', 'device_name' => 'postman'])
            ->assertOk()
            ->assertJsonPath('data.method', 'email')
            ->assertJsonPath('data.sent_to', 'ma*****@example.org')
            ->json('data.challenge');

        $code = $this->lastCode($admin);
        $this->postJson('/api/v1/auth/two-factor', ['challenge' => $challenge, 'code' => $code])->assertOk()->assertJsonPath('data.token_type', 'Bearer');

        // Each emailed code works once.
        $again = $this->postJson('/api/v1/auth/login', ['email' => 'maria.admin@example.org', 'password' => 'secret-password', 'device_name' => 'postman'])->json('data.challenge');
        $this->travel(31)->seconds();
        $this->postJson('/api/v1/auth/two-factor', ['challenge' => $again, 'code' => $code])->assertUnprocessable();
    }

    public function test_too_many_wrong_codes_void_the_code(): void
    {
        // The login rate limit (also on this step) is tested elsewhere; here we want 5 wrong codes in a row.
        app(SettingsRepository::class)->write('api.rate_limit.login', 30, null);
        app(SettingsRepository::class)->flush();
        $admin = $this->userWithRole(RoleName::Verifier, ['email' => 'maria.v@example.org', 'password' => 'secret-password']);
        $this->enrolByEmail($admin);
        Notification::fake();

        $challenge = $this->postJson('/api/v1/auth/login', ['email' => 'maria.v@example.org', 'password' => 'secret-password', 'device_name' => 'app'])->json('data.challenge');
        $code = $this->lastCode($admin);
        $wrong = $code === '000000' ? '111111' : '000000';

        foreach (range(1, 5) as $_) {
            $this->postJson('/api/v1/auth/two-factor', ['challenge' => $challenge, 'code' => $wrong])->assertUnprocessable();
        }

        $this->postJson('/api/v1/auth/two-factor', ['challenge' => $challenge, 'code' => $code])->assertUnprocessable();
    }

    public function test_resend_is_rate_limited(): void
    {
        $admin = $this->userWithRole(RoleName::SystemAdmin, ['email' => 'maria.r@example.org', 'password' => 'secret-password']);
        $this->enrolByEmail($admin);
        $this->travel(31)->seconds();

        $challenge = $this->postJson('/api/v1/auth/login', ['email' => 'maria.r@example.org', 'password' => 'secret-password', 'device_name' => 'app'])->json('data.challenge');

        $this->postJson('/api/v1/auth/two-factor/resend', ['challenge' => $challenge])->assertUnprocessable();
        $this->travel(31)->seconds();
        $this->postJson('/api/v1/auth/two-factor/resend', ['challenge' => $challenge])->assertOk();
    }

    public function test_the_codes_are_not_stored_in_plain_text(): void
    {
        $admin = $this->userWithRole(RoleName::SystemAdmin, ['email' => 'maria.p@example.org', 'password' => 'secret-password']);
        Sanctum::actingAs($admin);
        $this->postJson('/api/v1/me/two-factor/setup', ['password' => 'secret-password', 'method' => 'email'])->assertOk();

        $stored = cache()->get("two_factor:email:setup:{$admin->id}");
        $this->assertNotSame($this->lastCode($admin), $stored['hash']);
        $this->assertSame(64, strlen($stored['hash']));
    }
}
