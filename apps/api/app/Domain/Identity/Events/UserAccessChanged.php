<?php

namespace App\Domain\Identity\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

/** Invitation, role change, status change or facility assignment change. */
final class UserAccessChanged extends DomainEvent implements AuditableEvent
{
    /**
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>  $after
     */
    public function __construct(
        public readonly string $action,
        public readonly string $userPublicId,
        public readonly ?int $actorId,
        public readonly ?array $before,
        public readonly array $after,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "{$this->action}:{$this->eventId}",
            actorId: $this->actorId,
            action: $this->action,
            resourceType: 'user',
            resourceId: $this->userPublicId,
            before: $this->before,
            after: $this->after,
        );
    }
}
