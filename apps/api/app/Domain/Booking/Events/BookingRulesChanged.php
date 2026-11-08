<?php

namespace App\Domain\Booking\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

/** A facility's own booking rules changed (limit per person, cancel deadline, notice). */
final class BookingRulesChanged extends DomainEvent implements AuditableEvent
{
    /**
     * @param  array<string, int|null>  $before
     * @param  array<string, int|null>  $after
     */
    public function __construct(
        public readonly string $facilityPublicId,
        public readonly int $actorId,
        public readonly array $before,
        public readonly array $after,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "facility.booking_rules_changed:{$this->eventId}",
            actorId: $this->actorId,
            action: 'facility.booking_rules_changed',
            resourceType: 'facility',
            resourceId: $this->facilityPublicId,
            before: $this->before,
            after: $this->after,
        );
    }
}
