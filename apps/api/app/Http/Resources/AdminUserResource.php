<?php

namespace App\Http\Resources;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use App\Domain\Identity\Support\MemberAccess;
use App\Http\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
final class AdminUserResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->public_id,
            'name' => $this->name,
            'email' => $this->email,
            'mobile' => $this->mobile,
            'status' => $this->status,
            'mfa_enabled' => $this->mfa_enabled,
            'can_edit' => $request->user() !== null && ! $this->resource->is($request->user()) && app(MemberAccess::class)->canEdit($request->user(), $this->resource->loadMissing('roles', 'facilities')),
            'last_active_at' => Time::iso($this->last_active_at),
            'created_at' => Time::iso($this->created_at),
            'roles' => $this->roles->map(fn (Role $role): string => $role->name)->values(),
            'role_labels' => $this->roles->map(fn (Role $role): string => $role->displayName())->values(),
            'facilities' => $this->facilities->map(fn (Facility $facility): array => ['id' => $facility->public_id, 'name' => $facility->name])->values(),
            'is_you' => $request->user()?->id === $this->id,
        ];
    }
}
