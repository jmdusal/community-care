<?php

namespace App\Domain\Booking\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

/** Confirmed, declined, cancelled, completed or missed (AppointmentConfirmed in docs/events.md). */
final class AppointmentStatusChanged extends DomainEvent implements AuditableEvent
{
    public function __construct(
        public readonly int $appointmentId,
        public readonly string $appointmentPublicId,
        public readonly string $from,
        public readonly string $to,
        public readonly ?int $actorId,
        public readonly bool $byPatient,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "appointment.{$this->to}:{$this->eventId}",
            actorId: $this->actorId,
            action: "appointment.{$this->to}",
            resourceType: 'appointment',
            resourceId: $this->appointmentPublicId,
            before: ['status' => $this->from],
            after: ['status' => $this->to],
        );
    }
}
