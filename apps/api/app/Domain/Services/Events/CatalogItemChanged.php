<?php

namespace App\Domain\Services\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

/** A system admin created, edited, archived, restored or deleted a service or facility type. */
final class CatalogItemChanged extends DomainEvent implements AuditableEvent
{
    /**
     * @param  'service'|'facility_type'  $kind
     * @param  'created'|'updated'|'archived'|'restored'|'deleted'  $change
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     */
    public function __construct(
        public readonly string $kind,
        public readonly string $slug,
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
            eventKey: "{$this->kind}.{$this->change}:{$this->eventId}",
            actorId: $this->actorId,
            action: "{$this->kind}.{$this->change}",
            resourceType: $this->kind,
            resourceId: $this->slug,
            before: $this->before,
            after: $this->after,
        );
    }
}
