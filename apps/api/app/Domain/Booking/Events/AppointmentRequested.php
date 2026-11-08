<?php

namespace App\Domain\Booking\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

/**
 * A seat was taken: requested online by a patient or a guest, or booked by staff (source).
 * Carries ids only, never names or contact details. actorId is null for a guest.
 */
final class AppointmentRequested extends DomainEvent implements AuditableEvent
{
    public function __construct(
        public readonly int $appointmentId,
        public readonly string $appointmentPublicId,
        public readonly string $facilityPublicId,
        public readonly ?int $actorId,
        public readonly string $source = 'online',
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "appointment.requested:{$this->eventId}",
            actorId: $this->actorId,
            action: $this->source === 'staff' ? 'appointment.booked_by_staff' : 'appointment.requested',
            resourceType: 'appointment',
            resourceId: $this->appointmentPublicId,
            before: null,
            after: ['status' => $this->source === 'staff' ? 'confirmed' : 'requested', 'facility' => $this->facilityPublicId, 'source' => $this->source],
        );
    }
}
