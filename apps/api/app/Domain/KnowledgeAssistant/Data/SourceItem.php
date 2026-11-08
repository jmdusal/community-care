<?php

namespace App\Domain\KnowledgeAssistant\Data;

use Carbon\CarbonInterface;

/**
 * One approved record handed to a provider. The key ("F1", "D2") is the
 * marker a provider must use to cite it.
 */
final readonly class SourceItem
{
    public const FACILITY = 'facility';

    public const DOCUMENT = 'document';

    public function __construct(
        public string $key,
        public string $type,
        public string $id,
        public string $title,
        /** Full text given to the model. */
        public string $content,
        /** One-line summary used by the grounded (no-model) provider. */
        public string $summary,
        public ?string $url,
        public ?CarbonInterface $verifiedAt,
        public bool $isStale,
    ) {}
}
