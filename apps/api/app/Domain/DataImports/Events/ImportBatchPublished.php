<?php

namespace App\Domain\DataImports\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

final class ImportBatchPublished extends DomainEvent implements AuditableEvent
{
    /** @param array<string, int> $result */
    public function __construct(
        public readonly int $batchId,
        public readonly string $batchPublicId,
        public readonly array $result,
        public readonly ?int $actorId,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "import.published:{$this->eventId}",
            actorId: $this->actorId,
            action: 'import.published',
            resourceType: 'import_batch',
            resourceId: $this->batchPublicId,
            after: $this->result,
        );
    }
}
