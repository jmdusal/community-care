<?php

namespace App\Http\Resources;

use App\Domain\Audit\Models\AuditLog;
use App\Http\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin AuditLog */
final class AuditLogResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'created_at' => Time::iso($this->created_at),
            'actor' => $this->getAttribute('actor_name') ?? ($this->actor_id === null ? 'System' : 'Deleted user'),
            'action' => $this->action,
            'category' => strtok($this->action, '.'),
            'resource_type' => $this->resource_type,
            'resource_id' => $this->resource_id,
            'before' => $this->before,
            'after' => $this->after,
            'ip_masked' => $this->ip_masked,
            'request_id' => $this->request_id,
        ];
    }
}
