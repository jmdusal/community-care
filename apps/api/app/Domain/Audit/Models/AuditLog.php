<?php

namespace App\Domain\Audit\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['event_key', 'actor_id', 'action', 'resource_type', 'resource_id', 'before', 'after', 'ip_masked', 'request_id', 'created_at'])]
class AuditLog extends Model
{
    public $timestamps = false;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'before' => 'array',
            'after' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
