<?php

namespace App\Domain\KnowledgeAssistant\Data;

final readonly class RetrievedContext
{
    /** @param list<SourceItem> $items */
    public function __construct(
        public array $items,
        /** Services recognised in the question (names), for the answer wording. */
        public array $matchedServices = [],
        public bool $hasLocation = false,
    ) {}

    public function isEmpty(): bool
    {
        return $this->items === [];
    }

    public function find(string $key): ?SourceItem
    {
        foreach ($this->items as $item) {
            if ($item->key === $key) {
                return $item;
            }
        }

        return null;
    }

    /** @return list<SourceItem> */
    public function ofType(string $type): array
    {
        return array_values(array_filter($this->items, fn (SourceItem $item): bool => $item->type === $type));
    }
}
