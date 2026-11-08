<?php

namespace App\Domain\Identity\Models;

use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Enums\RoleScope;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

/**
 * A role: a set of permissions that applies to all facilities or to the member's assigned
 * facilities. Built-in roles (RoleName) start from code defaults and can be edited, except
 * the system admin (always everything) and the patient (no console access). Admins can
 * also add their own roles.
 */
#[Fillable(['name', 'label', 'description', 'scope', 'permissions', 'requires_two_factor'])]
class Role extends Model
{
    /**
     * Ids for the given roles (built-in names or custom role names), creating a missing
     * built-in role row from its defaults, so a role is never silently dropped.
     *
     * @param  list<RoleName|string>  $roles
     * @return list<int>
     */
    public static function idsFor(array $roles): array
    {
        return array_map(function (RoleName|string $role): int {
            $builtIn = $role instanceof RoleName ? $role : RoleName::tryFrom($role);
            if ($builtIn === null) {
                return self::query()->where('name', $role)->firstOrFail()->id;
            }

            return self::query()->firstOrCreate(['name' => $builtIn->value], self::defaultsFor($builtIn))->id;
        }, $roles);
    }

    /** @return array<string, mixed> */
    public static function defaultsFor(RoleName $role): array
    {
        return [
            'label' => $role->label(),
            'description' => $role->description(),
            'scope' => $role->scope()->value,
            'permissions' => array_map(fn (Permission $p) => $p->value, $role->defaultPermissions()),
            'requires_two_factor' => $role->requiresTwoFactor(),
        ];
    }

    /**
     * Names of the roles that grant a permission (optionally only all-facility roles),
     * for queries such as "who should be told".
     *
     * @return list<string>
     */
    public static function namesGranting(Permission $permission, bool $everywhere = false): array
    {
        return self::query()->get()
            ->filter(fn (self $role) => $role->grantsPermission($permission) && (! $everywhere || $role->facilityScope() === RoleScope::All))
            ->pluck('name')->values()->all();
    }

    public function builtIn(): ?RoleName
    {
        return RoleName::tryFrom($this->name);
    }

    public function isLocked(): bool
    {
        return $this->builtIn()?->isLocked() ?? false;
    }

    public function displayName(): string
    {
        return $this->label ?? $this->builtIn()?->label() ?? Str::headline($this->name);
    }

    public function facilityScope(): RoleScope
    {
        if ($this->isLocked()) {
            return $this->builtIn()->scope();
        }

        return RoleScope::tryFrom((string) $this->scope) ?? $this->builtIn()?->scope() ?? RoleScope::Assigned;
    }

    /** @return list<Permission> */
    public function grants(): array
    {
        $builtIn = $this->builtIn();
        if ($builtIn !== null && $builtIn->isLocked()) {
            return $builtIn->defaultPermissions();
        }
        if ($this->facilityScope() === RoleScope::None) {
            return [];
        }

        $stored = $this->permissions;
        $keys = is_array($stored) ? $stored : array_map(fn (Permission $p) => $p->value, $builtIn?->defaultPermissions() ?? []);
        $permissions = array_values(array_filter(array_map(fn (string $key) => Permission::tryFrom($key), $keys)));

        // System-wide permissions only count on a role that covers all facilities.
        return $this->facilityScope() === RoleScope::All
            ? $permissions
            : array_values(array_filter($permissions, fn (Permission $p) => ! $p->needsAllFacilities()));
    }

    public function grantsPermission(Permission $permission): bool
    {
        return in_array($permission, $this->grants(), true);
    }

    public function needsTwoFactor(): bool
    {
        if ($this->isLocked() || $this->requires_two_factor === null) {
            return (bool) $this->builtIn()?->requiresTwoFactor();
        }

        return $this->requires_two_factor;
    }

    /** @return BelongsToMany<User, $this> */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['permissions' => 'array', 'requires_two_factor' => 'boolean'];
    }
}
