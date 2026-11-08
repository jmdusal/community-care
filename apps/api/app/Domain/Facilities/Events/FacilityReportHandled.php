<?php

namespace App\Domain\Facilities\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

/** A public report about a facility was marked fixed or dismissed. */
final class FacilityReportHandled extends DomainEvent implements AuditableEvent
{
    public function __construct(
        public readonly string $reportPublicId,
        public readonly string $facilityPublicId,
        public readonly string $status,
        public readonly int $actorId,
        public readonly ?string $note,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "facility.report_{$this->status}:{$this->eventId}",
            actorId: $this->actorId,
            action: "facility.report_{$this->status}",
            resourceType: 'facility',
            resourceId: $this->facilityPublicId,
            before: ['report' => $this->reportPublicId, 'status' => 'open'],
            after: ['status' => $this->status, 'note' => $this->note],
        );
    }
}
