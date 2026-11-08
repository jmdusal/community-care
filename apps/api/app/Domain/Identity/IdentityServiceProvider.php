<?php

namespace App\Domain\Identity;

use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

final class IdentityServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        /*
         * Platform-level abilities, each backed by a permission that admins assign to roles
         * (Team & roles). Record-level rules (facility assignment, four-eyes review) live in
         * Policies; lists are limited to assigned facilities for "assigned facilities" roles.
         */
        $permission = fn (Permission $permission) => fn (User $user): bool => $user->isActive() && $user->hasPermission($permission);

        Gate::define('view-admin', fn (User $user): bool => $user->isActive() && $user->isTeamMember());
        Gate::define('manage-settings', $permission(Permission::SettingsManage));
        Gate::define('manage-roles', $permission(Permission::RolesManage));
        Gate::define('manage-catalog', $permission(Permission::CatalogManage));
        Gate::define('view-patients', $permission(Permission::PatientsView));
        Gate::define('manage-patients', $permission(Permission::PatientsManage));
        Gate::define('view-reports', $permission(Permission::ReportsView));
        // Assigned-facility roles see the audit history of their own facilities only (enforced in the controller).
        Gate::define('view-audit-log', $permission(Permission::AuditView));
        Gate::define('import-datasets', $permission(Permission::ImportsManage));
        Gate::define('review-imports', $permission(Permission::ImportsManage));
        Gate::define('view-team', $permission(Permission::TeamView));
        // Assigned-facility roles manage members at their own facilities only (MemberAccess).
        Gate::define('manage-users', $permission(Permission::TeamManage));
    }
}
