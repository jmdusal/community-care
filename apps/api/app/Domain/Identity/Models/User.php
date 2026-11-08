<?php

namespace App\Domain\Identity\Models;

use App\Domain\Booking\Models\Appointment;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Enums\RoleScope;
use App\Domain\Shared\Notifications\PushToken;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'mobile', 'privacy_consent_at', 'password', 'status'])]
#[Hidden(['id', 'password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'])]
#[UseFactory(UserFactory::class)]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUlids, Notifiable;

    /**
     * Mirror the column defaults so a freshly created model reports them before it is reloaded.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'active',
        'mfa_enabled' => false,
    ];

    /**
     * Only public_id is a ULID; the integer id stays the internal primary key.
     *
     * @return list<string>
     */
    public function uniqueIds(): array
    {
        return ['public_id'];
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    /** @return BelongsToMany<Role, $this> */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    /** Facilities this staff member is assigned to. @return BelongsToMany<Facility, $this> */
    public function facilities(): BelongsToMany
    {
        return $this->belongsToMany(Facility::class, 'facility_user')->withPivot(['assigned_by', 'assigned_at']);
    }

    public function isAssignedTo(Facility $facility): bool
    {
        return $this->facilities()->whereKey($facility->id)->exists();
    }

    /**
     * Has the permission through any role (anywhere it applies). For a specific
     * facility, use canAt(): an "assigned facilities" role only counts there.
     */
    public function hasPermission(Permission ...$any): bool
    {
        return $this->roles->contains(fn (Role $role) => array_any($any, fn (Permission $p) => $role->grantsPermission($p)));
    }

    /** Has the permission at this facility: from an all-facilities role, or an assigned-facilities role here. */
    public function canAt(Permission $permission, Facility $facility): bool
    {
        $roles = $this->roles->filter(fn (Role $role) => $role->grantsPermission($permission));
        if ($roles->contains(fn (Role $role) => $role->facilityScope() === RoleScope::All)) {
            return true;
        }

        return $roles->isNotEmpty() && $this->isAssignedTo($facility);
    }

    /** Has the permission through a role that covers every facility (not only assigned ones). */
    public function hasPermissionEverywhere(Permission $permission): bool
    {
        return $this->roles->contains(fn (Role $role) => $role->facilityScope() === RoleScope::All && $role->grantsPermission($permission));
    }

    /** @return list<string> permission keys from all roles */
    public function permissionKeys(): array
    {
        return $this->roles->flatMap(fn (Role $role) => array_map(fn (Permission $p) => $p->value, $role->grants()))->unique()->sort()->values()->all();
    }

    /** Full control of this facility (approve edits, re-verify): kept for older call sites. */
    public function administers(Facility $facility): bool
    {
        return $this->canAt(Permission::FacilitiesReview, $facility);
    }

    /** Works at assigned facilities only (no role that covers every facility). */
    public function worksAtAssignedFacilities(): bool
    {
        return ! $this->seesAllFacilities() && $this->roles->contains(fn (Role $role) => $role->facilityScope() === RoleScope::Assigned);
    }

    /** Has a role that covers every facility: lists are not limited to assignments. */
    public function seesAllFacilities(): bool
    {
        return $this->roles->contains(fn (Role $role) => $role->facilityScope() === RoleScope::All);
    }

    /** Has any console role (not only "patient"). */
    public function isTeamMember(): bool
    {
        return $this->roles->contains(fn (Role $role) => $role->facilityScope() !== RoleScope::None);
    }

    public function hasRole(RoleName ...$roles): bool
    {
        $names = array_map(fn (RoleName $role) => $role->value, $roles);

        return $this->roles->contains(fn (Role $role) => in_array($role->name, $names, true));
    }

    /** Private Reverb channel for this user's in-app notifications (public id: internal ids are never sent to clients). */
    public function receivesBroadcastNotificationsOn(): string
    {
        return 'users.'.$this->public_id;
    }

    /**
     * Appointments made for this person's account (booking pilot).
     *
     * @return HasMany<Appointment, $this>
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'patient_id');
    }

    /** @return HasMany<PushToken, $this> */
    public function pushTokens(): HasMany
    {
        return $this->hasMany(PushToken::class);
    }

    public function hasTwoFactor(): bool
    {
        return $this->two_factor_confirmed_at !== null
            && ($this->two_factor_method === 'email' || $this->two_factor_secret !== null);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_active_at' => 'datetime',
            'privacy_consent_at' => 'datetime',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'array',
            'two_factor_confirmed_at' => 'datetime',
            'mfa_enabled' => 'boolean',
            'password' => 'hashed',
        ];
    }
}
