<?php

namespace Tests\Feature\Database;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use Database\Seeders\SuperAdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

final class SuperAdminSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_the_super_admin_who_can_sign_in(): void
    {
        $this->seed(SuperAdminSeeder::class);
        $this->seed(SuperAdminSeeder::class);

        $admin = User::query()->where('email', 'admin@admin.com')->firstOrFail();
        $this->assertTrue($admin->hasRole(RoleName::SystemAdmin));
        $this->assertSame(1, User::query()->count(), 'Running the seeder twice must not duplicate the account.');

        $this->postJson('/api/v1/auth/login', ['email' => 'admin@admin.com', 'password' => 'password', 'device_name' => 'test'])
            ->assertOk()
            ->assertJsonPath('data.user.roles', ['system_admin']);
    }

    public function test_the_default_password_is_refused_in_production(): void
    {
        $this->app['env'] = 'production';

        $this->expectException(RuntimeException::class);

        // Called directly: db:seed itself asks for confirmation in production.
        $this->app->make(SuperAdminSeeder::class)->run();
    }
}
