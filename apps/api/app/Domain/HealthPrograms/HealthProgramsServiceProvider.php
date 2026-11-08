<?php

namespace App\Domain\HealthPrograms;

use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

final class HealthProgramsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::define('manage-programs', fn (User $user) => $user->isActive() && $user->hasPermission(Permission::ProgramsManage));
    }
}
