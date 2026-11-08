<?php

namespace App\Domain\Settings\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

final class SettingUpdated extends DomainEvent implements AuditableEvent
{
    public function __construct(
        public readonly string $key,
        public readonly int|float|bool|string $oldValue,
        public readonly int|float|bool|string $newValue,
        public readonly ?int $actorId,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "settings.updated:{$this->eventId}",
            actorId: $this->actorId,
            action: 'settings.updated',
            resourceType: 'setting',
            resourceId: $this->key,
            before: ['value' => $this->oldValue],
            after: ['value' => $this->newValue],
        );
    }
}
