<?php

namespace Database\Seeders;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Role;
use Illuminate\Database\Seeder;

final class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // Built-in roles start from their code defaults; permissions edited in Team & roles are kept.
        foreach (RoleName::cases() as $role) {
            Role::query()->firstOrCreate(['name' => $role->value], Role::defaultsFor($role));
        }
    }
}
