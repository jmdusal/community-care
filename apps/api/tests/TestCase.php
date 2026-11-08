<?php

namespace Tests;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /** Create an active user holding the given role. */
    protected function userWithRole(RoleName $roleName, array $attributes = []): User
    {
        $role = Role::query()->firstOrCreate(['name' => $roleName->value], ['description' => $roleName->description()]);

        $user = User::factory()->create($attributes);
        $user->roles()->attach($role);

        return $user->load('roles');
    }
}
