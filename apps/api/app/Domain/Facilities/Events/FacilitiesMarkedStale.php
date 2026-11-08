<?php

namespace App\Domain\Facilities\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

/** The nightly job marked verified records stale (one event per run, not per record). */
final class FacilitiesMarkedStale extends DomainEvent implements AuditableEvent
{
    public function __construct(
        public readonly int $count,
        public readonly int $thresholdDays,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "facility.marked_stale:{$this->eventId}",
            actorId: null,
            action: 'facility.marked_stale',
            resourceType: 'facility',
            resourceId: "{$this->count} records",
            after: ['count' => $this->count, 'threshold_days' => $this->thresholdDays],
        );
    }
}
