<?php

namespace App\Domain\Identity\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

/** A role was created, edited (permissions, scope, two-factor) or deleted. */
final class RoleChanged extends DomainEvent implements AuditableEvent
{
    /**
     * @param  'created'|'updated'|'deleted'  $change
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     */
    public function __construct(
        public readonly string $roleName,
        public readonly string $change,
        public readonly int $actorId,
        public readonly ?array $before,
        public readonly ?array $after,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "role.{$this->change}:{$this->eventId}",
            actorId: $this->actorId,
            action: "role.{$this->change}",
            resourceType: 'role',
            resourceId: $this->roleName,
            before: $this->before,
            after: $this->after,
        );
    }
}
