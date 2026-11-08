<?php

namespace App\Domain\Facilities\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

/** Staff updated "Today at this facility" (doctor, open/closed, out-of-stock items, note). */
final class FacilityTodayUpdated extends DomainEvent implements AuditableEvent
{
    /** @param array<string, mixed> $after */
    public function __construct(public readonly string $facilityPublicId, public readonly int $actorId, public readonly array $after)
    {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "facility.today_updated:{$this->eventId}",
            actorId: $this->actorId,
            action: 'facility.today_updated',
            resourceType: 'facility',
            resourceId: $this->facilityPublicId,
            before: null,
            after: $this->after,
        );
    }
}
