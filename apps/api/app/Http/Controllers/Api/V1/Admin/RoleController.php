<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Enums\RoleScope;
use App\Domain\Identity\Events\RoleChanged;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Support\MemberAccess;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Roles and their permissions (Team & roles → Roles). Anyone who can view the team sees
 * them; people with "Create and edit roles" change them. The system admin role always has
 * everything and the patient role has no console access; neither can be edited. Built-in
 * roles can be edited but not deleted; custom roles can be deleted once nobody has them.
 */
final class RoleController extends Controller
{
    public function index(Request $request, MemberAccess $access): JsonResponse
    {
        Gate::authorize('view-team');

        $roles = Role::query()->withCount('users')->orderBy('id')->get()
            ->reject(fn (Role $role) => $role->facilityScope() === RoleScope::None);
        $grantable = $access->grantableRoles($request->user())->pluck('name');
        $canManageTeam = $request->user()->hasPermission(Permission::TeamManage);

        return response()->json([
            'data' => $roles->map(fn (Role $role) => [...$this->present($role), 'grantable' => $canManageTeam && $grantable->contains($role->name)])->values(),
            'meta' => [
                'permissions' => array_map(fn (Permission $p): array => [
                    'key' => $p->value,
                    'label' => $p->label(),
                    'group' => $p->group(),
                    'needs_all_facilities' => $p->needsAllFacilities(),
                ], Permission::cases()),
                'can_manage' => Gate::allows('manage-roles'),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('manage-roles');
        $input = $this->validated($request, null);

        $name = Str::snake(Str::ascii($input['label']));
        if ($name === '' || Role::query()->where('name', $name)->exists() || RoleName::tryFrom($name) !== null) {
            throw ValidationException::withMessages(['label' => ['A role with this name already exists.']]);
        }

        $role = Role::query()->create([...$input, 'name' => $name]);
        RoleChanged::dispatch($name, 'created', $request->user()->id, null, $this->auditable($role));

        return response()->json(['data' => $this->present($role->loadCount('users'))], 201);
    }

    public function update(Request $request, string $role): JsonResponse
    {
        Gate::authorize('manage-roles');
        $found = $this->find($role);
        if ($found->isLocked()) {
            throw new ConflictHttpException("The {$found->displayName()} role cannot be changed.");
        }

        $input = $this->validated($request, $found);
        $before = $this->auditable($found);
        $found->update($input);

        if ($before !== $this->auditable($found)) {
            RoleChanged::dispatch($found->name, 'updated', $request->user()->id, $before, $this->auditable($found));
        }

        return response()->json(['data' => $this->present($found->loadCount('users'))]);
    }

    public function destroy(Request $request, string $role): Response
    {
        Gate::authorize('manage-roles');
        $found = $this->find($role)->loadCount('users');

        if ($found->builtIn() !== null) {
            throw new ConflictHttpException('Built-in roles cannot be deleted. Change their permissions instead.');
        }
        if ($found->users_count > 0) {
            throw new ConflictHttpException("{$found->users_count} ".Str::plural('member', $found->users_count).' still have this role. Give them another role first.');
        }

        $before = $this->auditable($found);
        $found->delete();
        RoleChanged::dispatch($found->name, 'deleted', $request->user()->id, $before, null);

        return response()->noContent();
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Role $role): array
    {
        $creating = $role === null;
        $input = $request->validate([
            'label' => [$creating ? 'required' : 'sometimes', 'string', 'min:2', 'max:60', Rule::unique('roles', 'label')->ignore($role?->id)],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'scope' => [$creating ? 'required' : 'sometimes', Rule::in([RoleScope::All->value, RoleScope::Assigned->value])],
            'permissions' => [$creating ? 'required' : 'sometimes', 'array'],
            'permissions.*' => ['string', 'distinct', Rule::in(Permission::values())],
            'requires_two_factor' => ['sometimes', 'boolean'],
        ]);

        $scope = RoleScope::from($input['scope'] ?? $role?->facilityScope()->value);
        $permissions = $input['permissions'] ?? array_map(fn (Permission $p) => $p->value, $role?->grants() ?? []);

        $systemWide = array_values(array_filter($permissions, fn (string $key) => Permission::from($key)->needsAllFacilities()));
        if ($scope === RoleScope::Assigned && $systemWide !== []) {
            throw ValidationException::withMessages(['permissions' => ['These work only for a role that covers all facilities: '.implode(', ', array_map(fn (string $k) => Permission::from($k)->label(), $systemWide)).'.']]);
        }

        // Nobody can create a role more powerful than themselves.
        $beyond = array_diff($permissions, $request->user()->permissionKeys());
        if ($beyond !== []) {
            throw ValidationException::withMessages(['permissions' => ['You can only give permissions you have yourself.']]);
        }

        if (isset($input['permissions'])) {
            $input['permissions'] = array_values(array_unique($permissions));
        }

        return $input;
    }

    private function find(string $name): Role
    {
        return Role::query()->where('name', $name)->firstOrFail();
    }

    /** @return array<string, mixed> */
    private function auditable(Role $role): array
    {
        return [
            'label' => $role->displayName(),
            'scope' => $role->facilityScope()->value,
            'permissions' => array_map(fn (Permission $p) => $p->value, $role->grants()),
            'requires_two_factor' => $role->needsTwoFactor(),
        ];
    }

    /** @return array<string, mixed> */
    private function present(Role $role): array
    {
        return [
            'name' => $role->name,
            'label' => $role->displayName(),
            'description' => $role->description,
            'scope' => $role->facilityScope()->value,
            'permissions' => array_map(fn (Permission $p) => $p->value, $role->grants()),
            'requires_two_factor' => $role->needsTwoFactor(),
            'built_in' => $role->builtIn() !== null,
            'locked' => $role->isLocked(),
            'members' => $role->users_count ?? 0,
        ];
    }
}
