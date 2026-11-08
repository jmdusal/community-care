<?php

namespace App\Domain\Facilities\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

/** The submitter withdrew their change request. */
final class ChangeRequestWithdrawn extends DomainEvent implements AuditableEvent
{
    /**
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     */
    public function __construct(
        public readonly int $facilityId,
        public readonly string $facilityPublicId,
        public readonly ?int $actorId,
        public readonly ?string $changeRequestPublicId = null,
        public readonly ?array $before = null,
        public readonly ?array $after = null,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "facility.change_withdrawn:{$this->eventId}",
            actorId: $this->actorId,
            action: 'facility.change_withdrawn',
            resourceType: 'facility',
            resourceId: $this->facilityPublicId,
            before: $this->before,
            after: $this->after === null && $this->changeRequestPublicId === null ? null : [...($this->after ?? []), ...($this->changeRequestPublicId ? ['change_request' => $this->changeRequestPublicId] : [])],
        );
    }
}
