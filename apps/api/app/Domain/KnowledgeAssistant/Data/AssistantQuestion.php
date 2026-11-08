<?php

namespace App\Domain\KnowledgeAssistant\Data;

final readonly class AssistantQuestion
{
    public function __construct(
        public string $text,
        public ?string $regionCode = null,
        public ?float $latitude = null,
        public ?float $longitude = null,
        /** "public" for the directory, "preview" for the admin test console. */
        public string $channel = 'public',
    ) {}

    public function isNearby(): bool
    {
        return $this->latitude !== null && $this->longitude !== null;
    }
}
