<?php

namespace App\Domain\KnowledgeAssistant\Services;

use App\Domain\KnowledgeAssistant\Contracts\AiProvider;
use App\Domain\KnowledgeAssistant\Data\AssistantAnswer;
use App\Domain\KnowledgeAssistant\Data\AssistantQuestion;
use App\Domain\KnowledgeAssistant\Data\RetrievedContext;
use App\Domain\KnowledgeAssistant\Data\SourceItem;
use App\Domain\KnowledgeAssistant\Enums\AnswerOutcome;
use App\Domain\KnowledgeAssistant\Models\AssistantInteraction;
use App\Domain\KnowledgeAssistant\Providers\GroundedProvider;
use App\Domain\KnowledgeAssistant\Support\KnowledgeRetriever;
use App\Domain\KnowledgeAssistant\Support\SafetyScreen;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * The assistant's pipeline:
 * 1. safety screen (emergency / diagnosis) — no retrieval, no model call;
 * 2. retrieval of approved records — nothing found means "no information", no model call;
 * 3. the configured provider writes the answer; on failure or refusal the grounded provider does;
 * 4. only sources the answer cites are returned, with freshness.
 */
final class KnowledgeAssistantService
{
    public const NO_INFORMATION_ANSWER = 'I couldn\'t find approved information about that in CommunityCare. '
        .'Try searching the directory by facility name or area, call your local health center, or check the Department of Health\'s official channels.';

    public function __construct(
        private readonly SafetyScreen $screen,
        private readonly KnowledgeRetriever $retriever,
        private readonly AiProvider $provider,
        private readonly GroundedProvider $grounded,
    ) {}

    public function providerName(): string
    {
        return $this->provider->name();
    }

    public function ask(AssistantQuestion $question): AssistantAnswer
    {
        $started = hrtime(true);
        $answer = $this->answer($question);

        AssistantInteraction::query()->create([
            'channel' => $question->channel,
            'outcome' => $answer->outcome,
            'provider' => $answer->provider,
            'latency_ms' => (int) ((hrtime(true) - $started) / 1_000_000),
            'citation_count' => count($answer->citations),
            'used_fallback' => $answer->usedFallback,
            'created_at' => now(),
        ]);

        return $answer;
    }

    /** The safety screen and retrieval only: what a question would trigger before any provider sees it. */
    public function screenOnly(AssistantQuestion $question): AnswerOutcome
    {
        return $this->screen->screen($question->text)
            ?? ($this->retriever->retrieve($question)->isEmpty() ? AnswerOutcome::NoInformation : AnswerOutcome::Answered);
    }

    private function answer(AssistantQuestion $question): AssistantAnswer
    {
        $stopped = $this->screen->screen($question->text);

        if ($stopped === AnswerOutcome::Emergency) {
            return new AssistantAnswer($stopped, SafetyScreen::EMERGENCY_ANSWER, [], 'safety');
        }

        if ($stopped === AnswerOutcome::OutOfScope) {
            return new AssistantAnswer($stopped, SafetyScreen::OUT_OF_SCOPE_ANSWER, [], 'safety');
        }

        $context = $this->retriever->retrieve($question);

        if ($context->isEmpty()) {
            return new AssistantAnswer(AnswerOutcome::NoInformation, self::NO_INFORMATION_ANSWER, [], 'retrieval');
        }

        [$text, $provider, $usedFallback] = $this->write($question, $context);
        $citations = $this->cited($text, $context);

        if ($citations === []) {
            // An answer that cites nothing is not grounded: never show it as fact.
            return new AssistantAnswer(AnswerOutcome::NoInformation, self::NO_INFORMATION_ANSWER, [], $provider, $usedFallback);
        }

        return new AssistantAnswer(AnswerOutcome::Answered, $text, $citations, $provider, $usedFallback);
    }

    /** @return array{0: string, 1: string, 2: bool} text, provider name, used fallback */
    private function write(AssistantQuestion $question, RetrievedContext $context): array
    {
        if ($this->provider->name() !== $this->grounded->name()) {
            try {
                $text = $this->provider->answer($question, $context);

                if ($text !== null) {
                    return [$text, $this->provider->name(), false];
                }

                Log::info('Assistant provider declined; using the grounded answer.', ['provider' => $this->provider->name()]);
            } catch (Throwable $exception) {
                Log::warning('Assistant provider failed; using the grounded answer.', ['provider' => $this->provider->name(), 'error' => $exception->getMessage()]);
            }

            return [(string) $this->grounded->answer($question, $context), $this->grounded->name(), true];
        }

        return [(string) $this->provider->answer($question, $context), $this->provider->name(), false];
    }

    /**
     * Sources the answer actually cites, in order of first mention.
     * Markers that point to no source are removed from the text's citations.
     *
     * @return list<SourceItem>
     */
    private function cited(string $text, RetrievedContext $context): array
    {
        preg_match_all('/\[([FD]\d{1,2}(?:\s*,\s*[FD]\d{1,2})*)\]/', $text, $matches);
        $keys = array_unique(array_merge(...array_map(fn (string $group): array => preg_split('/\s*,\s*/', $group) ?: [], $matches[1] ?: [''])));

        $cited = [];
        foreach ($keys as $key) {
            $item = $context->find($key);
            if ($item !== null) {
                $cited[] = $item;
            }
        }

        return $cited;
    }
}
