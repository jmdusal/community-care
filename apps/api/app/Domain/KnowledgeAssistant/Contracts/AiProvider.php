<?php

namespace App\Domain\KnowledgeAssistant\Contracts;

use App\Domain\KnowledgeAssistant\Data\AssistantQuestion;
use App\Domain\KnowledgeAssistant\Data\RetrievedContext;

/**
 * Writes an answer from approved context only. Implementations cite facts
 * with the source markers ("[F1]", "[D1]") from the context.
 *
 * Providers never see questions that were stopped by the safety screen,
 * and are never called with an empty context.
 */
interface AiProvider
{
    public function name(): string;

    /**
     * @return string|null the answer text, or null if the provider declined
     *
     * @throws \Throwable when the provider is unreachable; the service falls back
     */
    public function answer(AssistantQuestion $question, RetrievedContext $context): ?string;
}
