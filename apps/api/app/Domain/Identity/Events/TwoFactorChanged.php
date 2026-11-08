<?php

namespace App\Domain\Identity\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

/** Two-factor sign-in turned on, off, reset by an admin, or a recovery code used. Never carries secrets. */
final class TwoFactorChanged extends DomainEvent implements AuditableEvent
{
    /** @param 'enabled'|'disabled'|'reset'|'recovery_code_used'|'recovery_codes_regenerated' $change */
    public function __construct(
        public readonly string $change,
        public readonly string $userPublicId,
        public readonly int $actorId,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "user.two_factor_{$this->change}:{$this->eventId}",
            actorId: $this->actorId,
            action: "user.two_factor_{$this->change}",
            resourceType: 'user',
            resourceId: $this->userPublicId,
            before: null,
            after: null,
        );
    }
}
