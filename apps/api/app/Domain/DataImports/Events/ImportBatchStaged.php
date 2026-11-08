<?php

namespace App\Domain\DataImports\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

/**
 * Records are staged, matched and flagged. Flagged records appear in the
 * review queue (a query, so one event per batch is enough).
 */
final class ImportBatchStaged extends DomainEvent implements AuditableEvent
{
    /** @param array<string, int> $counts */
    public function __construct(
        public readonly int $batchId,
        public readonly string $batchPublicId,
        public readonly array $counts,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "import.staged:{$this->eventId}",
            actorId: null,
            action: 'import.staged',
            resourceType: 'import_batch',
            resourceId: $this->batchPublicId,
            after: $this->counts,
        );
    }
}
