<?php

namespace App\Domain\KnowledgeAssistant\Providers;

use App\Domain\KnowledgeAssistant\Contracts\AiProvider;
use App\Domain\KnowledgeAssistant\Data\AssistantQuestion;
use App\Domain\KnowledgeAssistant\Data\RetrievedContext;
use App\Domain\KnowledgeAssistant\Data\SourceItem;

/**
 * Answers without a language model: it lists the retrieved records word for
 * word. It cannot invent anything, works with no API key and costs nothing,
 * so it is the default and the fallback when a model provider fails.
 */
final class GroundedProvider implements AiProvider
{
    public function name(): string
    {
        return 'grounded';
    }

    public function answer(AssistantQuestion $question, RetrievedContext $context): ?string
    {
        $parts = [];
        $facilities = $context->ofType(SourceItem::FACILITY);
        $documents = $context->ofType(SourceItem::DOCUMENT);

        if ($facilities !== []) {
            $heading = $context->matchedServices !== []
                ? 'Facilities on record that list '.implode(', ', $context->matchedServices).':'
                : 'Facilities on record that may help:';

            $parts[] = $heading."\n".implode("\n", array_map(fn (SourceItem $item): string => "• {$item->summary} [{$item->key}]", $facilities));

            if (! $context->hasLocation) {
                $parts[] = 'Share your location or choose a region to see facilities closer to you.';
            }
        }

        if ($documents !== []) {
            $parts[] = "From approved health information:\n".implode("\n", array_map(fn (SourceItem $item): string => "• {$item->summary} [{$item->key}]", $documents));
        }

        $parts[] = 'Hours and services can change. Call the facility before you go.';

        return implode("\n\n", $parts);
    }
}
