<?php

namespace App\Domain\Booking\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

/** A system admin opted a facility into, or out of, the booking pilot. */
final class FacilityBookingChanged extends DomainEvent implements AuditableEvent
{
    public function __construct(
        public readonly string $facilityPublicId,
        public readonly bool $enabled,
        public readonly int $actorId,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "facility.booking_changed:{$this->eventId}",
            actorId: $this->actorId,
            action: 'facility.booking_'.($this->enabled ? 'enabled' : 'disabled'),
            resourceType: 'facility',
            resourceId: $this->facilityPublicId,
            before: ['booking_enabled' => ! $this->enabled],
            after: ['booking_enabled' => $this->enabled],
        );
    }
}
