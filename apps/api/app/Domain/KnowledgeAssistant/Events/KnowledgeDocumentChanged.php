<?php

namespace App\Domain\KnowledgeAssistant\Events;

use App\Domain\Shared\Contracts\AuditableEvent;
use App\Domain\Shared\Data\AuditEntryData;
use App\Domain\Shared\Events\DomainEvent;

/** A knowledge document was created, edited, published or archived. */
final class KnowledgeDocumentChanged extends DomainEvent implements AuditableEvent
{
    /**
     * @param  'created'|'updated'|'published'|'archived'  $change
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     */
    public function __construct(
        public readonly string $change,
        public readonly string $documentPublicId,
        public readonly int $actorId,
        public readonly ?array $before = null,
        public readonly ?array $after = null,
    ) {
        parent::__construct();
    }

    public function toAuditEntry(): AuditEntryData
    {
        return new AuditEntryData(
            eventKey: "knowledge_document.{$this->change}:{$this->eventId}",
            actorId: $this->actorId,
            action: "knowledge_document.{$this->change}",
            resourceType: 'knowledge_document',
            resourceId: $this->documentPublicId,
            before: $this->before,
            after: $this->after,
        );
    }
}
