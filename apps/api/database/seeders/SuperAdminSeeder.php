<?php

namespace Database\Seeders;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\App;
use RuntimeException;

/**
 * Creates (or updates) the super admin account from config('communitycare.super_admin').
 * Defaults: admin@admin.com / password. Safe to run repeatedly.
 */
final class SuperAdminSeeder extends Seeder
{
    public const DEFAULT_PASSWORD = 'password';

    public function run(): void
    {
        $account = config('communitycare.super_admin');

        if (App::environment('production') && $account['password'] === self::DEFAULT_PASSWORD) {
            throw new RuntimeException('Refusing to create the super admin with the default password in production. Set SUPER_ADMIN_PASSWORD first.');
        }

        $user = User::query()->updateOrCreate(
            ['email' => $account['email']],
            [
                'name' => $account['name'],
                'password' => $account['password'],
                'status' => 'active',
                'email_verified_at' => now(),
            ],
        );

        $role = Role::query()->firstOrCreate(
            ['name' => RoleName::SystemAdmin->value],
            ['description' => RoleName::SystemAdmin->description()],
        );

        $user->roles()->syncWithoutDetaching([$role->id]);
    }
}
