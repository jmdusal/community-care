<?php

namespace App\Domain\DataImports\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

final class ImportBatchFailed extends DomainEvent implements AuditableEvent
{
    public function __construct(
        public readonly int $batchId,
        public readonly string $batchPublicId,
        public readonly string $reason,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "import.failed:{$this->eventId}",
            actorId: null,
            action: 'import.failed',
            resourceType: 'import_batch',
            resourceId: $this->batchPublicId,
            after: ['reason' => $this->reason, 'published_data_changed' => false],
        );
    }
}
