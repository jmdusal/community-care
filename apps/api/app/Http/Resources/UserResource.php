<?php

namespace App\Http\Resources;

use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use App\Domain\Identity\TwoFactor\TwoFactorService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
final class UserResource extends JsonResource
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
            'two_factor' => [
                'enabled' => $this->hasTwoFactor(),
                'required' => app(TwoFactorService::class)->isRequiredFor($this->resource),
            ],
            'roles' => $this->whenLoaded('roles', fn () => $this->roles->map(fn (Role $role): string => $role->name)->values()),
            // What the console shows is driven by these (the API checks them again on every request).
            'permissions' => $this->whenLoaded('roles', fn () => $this->resource->permissionKeys()),
            'sees_all_facilities' => $this->whenLoaded('roles', fn () => $this->resource->seesAllFacilities()),
            'is_team_member' => $this->whenLoaded('roles', fn () => $this->resource->isTeamMember()),
            'facilities' => $this->whenLoaded('facilities', fn () => $this->facilities->map(fn ($facility): array => ['id' => $facility->public_id, 'name' => $facility->name])->values()),
        ];
    }
}
