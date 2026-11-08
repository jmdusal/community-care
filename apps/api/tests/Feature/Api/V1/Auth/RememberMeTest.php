<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Domain\Identity\Enums\RoleName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** "Keep me signed in" on the web app: a one-year remember-me cookie that resets and suspensions end. */
final class RememberMeTest extends TestCase
{
    use RefreshDatabase;

    private const SPA = ['Origin' => 'http://community-care.test', 'Referer' => 'http://community-care.test/login'];

    protected function setUp(): void
    {
        parent::setUp();

        config(['sanctum.stateful' => ['community-care.test']]);
    }

    public function test_keep_me_signed_in_sets_a_one_year_remember_cookie(): void
    {
        $user = $this->userWithRole(RoleName::SystemAdmin, ['email' => 'admin@example.org', 'password' => 'secret-password']);

        $response = $this->withHeaders(self::SPA)
            ->postJson('/api/v1/auth/login', ['email' => 'admin@example.org', 'password' => 'secret-password', 'remember' => true])
            ->assertOk()
            ->assertJsonMissingPath('data.token');

        $cookie = collect($response->headers->getCookies())->first(fn ($c) => str_starts_with($c->getName(), 'remember_web_'));
        $this->assertNotNull($cookie, 'remember-me cookie was not set');
        $this->assertEqualsWithDelta(now()->addDays(365)->getTimestamp(), $cookie->getExpiresTime(), 120);
        $this->assertNotNull($user->refresh()->getRememberToken());
    }

    public function test_without_keep_me_signed_in_no_remember_cookie_is_set(): void
    {
        $this->userWithRole(RoleName::SystemAdmin, ['email' => 'admin@example.org', 'password' => 'secret-password']);

        $response = $this->withHeaders(self::SPA)
            ->postJson('/api/v1/auth/login', ['email' => 'admin@example.org', 'password' => 'secret-password'])
            ->assertOk();

        $this->assertNull(collect($response->headers->getCookies())->first(fn ($c) => str_starts_with($c->getName(), 'remember_web_')));
    }

    public function test_suspending_a_user_invalidates_their_remember_token(): void
    {
        $member = $this->userWithRole(RoleName::Verifier);
        Auth::guard('web')->login($member, true);
        $before = $member->refresh()->getRememberToken();
        Auth::guard('web')->logout();

        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));
        $this->patchJson("/api/v1/admin/users/{$member->public_id}", ['status' => 'suspended'])->assertOk();

        $this->assertNotSame($before, $member->refresh()->getRememberToken());
    }
}
