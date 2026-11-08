<?php

namespace App\Domain\Shared\Data;

final readonly class AuditEntryData
{
    /**
     * @param  string  $eventKey  Unique per business fact; repeated writes with the same key are ignored.
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     */
    public function __construct(
        public string $eventKey,
        public ?int $actorId,
        public string $action,
        public string $resourceType,
        public ?string $resourceId,
        public ?array $before = null,
        public ?array $after = null,
    ) {}
}
