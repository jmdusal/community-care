<?php

namespace App\Domain\DataImports\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

final class ImportRecordDecided extends DomainEvent implements AuditableEvent
{
    /** @param list<string> $flags */
    public function __construct(
        public readonly int $recordId,
        public readonly string $batchPublicId,
        public readonly ?string $sourceRecordId,
        public readonly string $decision,
        public readonly ?string $reason,
        public readonly array $flags,
        public readonly int $actorId,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "import.record_decided:{$this->eventId}",
            actorId: $this->actorId,
            action: "import.record_{$this->decision}",
            resourceType: 'import_staging_record',
            resourceId: (string) $this->recordId,
            after: [
                'batch' => $this->batchPublicId,
                'source_record_id' => $this->sourceRecordId,
                'flags' => $this->flags,
                'reason' => $this->reason,
            ],
        );
    }
}
