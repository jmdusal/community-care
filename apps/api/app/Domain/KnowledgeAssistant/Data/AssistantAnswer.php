<?php

namespace App\Domain\KnowledgeAssistant\Data;

use App\Domain\KnowledgeAssistant\Enums\AnswerOutcome;

final readonly class AssistantAnswer
{
    public const NOTICE = 'CommunityCare gives directory information only, not medical advice. In an emergency call 911.';

    /** @param list<SourceItem> $citations */
    public function __construct(
        public AnswerOutcome $outcome,
        public string $text,
        public array $citations,
        public string $provider,
        public bool $usedFallback = false,
    ) {}
}
