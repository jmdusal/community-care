<?php

namespace App\Domain\DataImports\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

final class ImportBatchStarted extends DomainEvent implements AuditableEvent
{
    public function __construct(
        public readonly int $batchId,
        public readonly string $batchPublicId,
        public readonly string $sourceName,
        public readonly ?string $sourceVersion,
        public readonly ?int $actorId,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "import.started:{$this->eventId}",
            actorId: $this->actorId,
            action: 'import.started',
            resourceType: 'import_batch',
            resourceId: $this->batchPublicId,
            after: ['source' => $this->sourceName, 'version' => $this->sourceVersion],
        );
    }
}
