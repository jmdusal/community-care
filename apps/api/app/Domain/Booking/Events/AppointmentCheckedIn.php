<?php

namespace App\Domain\Booking\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

/** A confirmed patient arrived at the desk (QR or reference code) and was given a queue number. */
final class AppointmentCheckedIn extends DomainEvent implements AuditableEvent
{
    public function __construct(
        public readonly int $appointmentId,
        public readonly string $appointmentPublicId,
        public readonly string $queueNumber,
        public readonly int $actorId,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "appointment.checked_in:{$this->eventId}",
            actorId: $this->actorId,
            action: 'appointment.checked_in',
            resourceType: 'appointment',
            resourceId: $this->appointmentPublicId,
            before: ['arrived' => false],
            after: ['arrived' => true, 'queue_number' => $this->queueNumber],
        );
    }
}
