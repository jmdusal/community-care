<?php

namespace App\Domain\HealthPrograms\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

/** A program was created, edited, published or archived. Publishing is HealthProgramPublished in docs/events.md. */
final class HealthProgramChanged extends DomainEvent implements AuditableEvent
{
    /**
     * @param  'created'|'updated'|'published'|'archived'  $change
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     */
    public function __construct(
        public readonly string $change,
        public readonly string $programPublicId,
        public readonly int $actorId,
        public readonly ?array $before = null,
        public readonly ?array $after = null,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "health_program.{$this->change}:{$this->eventId}",
            actorId: $this->actorId,
            action: "health_program.{$this->change}",
            resourceType: 'health_program',
            resourceId: $this->programPublicId,
            before: $this->before,
            after: $this->after,
        );
    }
}
