<?php

namespace App\Domain\KnowledgeAssistant\Queries;

use App\Domain\KnowledgeAssistant\Enums\AnswerOutcome;
use App\Domain\KnowledgeAssistant\Enums\DocumentStatus;
use App\Domain\KnowledgeAssistant\Models\AssistantInteraction;
use App\Domain\KnowledgeAssistant\Models\KnowledgeDocument;
use App\Domain\Settings\Contracts\SettingsRepository;

/** Counts for the admin assistant screen (public questions only, last N days). */
final class AssistantOverviewQuery
{
    public function __construct(private readonly SettingsRepository $settings) {}

    /** @return array<string, mixed> */
    public function get(int $days = 30): array
    {
        $since = now()->subDays($days);
        $public = AssistantInteraction::query()->where('channel', 'public')->where('created_at', '>=', $since);

        $byOutcome = (clone $public)->selectRaw('outcome, COUNT(*) as total')->groupBy('outcome')->pluck('total', 'outcome');
        $total = (int) $byOutcome->sum();
        $latencies = (clone $public)->where('outcome', AnswerOutcome::Answered)->orderBy('latency_ms')->pluck('latency_ms');

        $staleAfter = $this->settings->int('verification.stale_after_days');
        $documents = KnowledgeDocument::query()->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');

        return [
            'days' => $days,
            'questions' => $total,
            'outcomes' => collect(AnswerOutcome::cases())->mapWithKeys(fn (AnswerOutcome $outcome): array => [$outcome->value => (int) ($byOutcome[$outcome->value] ?? 0)])->all(),
            'fallbacks' => (clone $public)->where('used_fallback', true)->count(),
            'p95_latency_ms' => $latencies->isEmpty() ? null : (int) $latencies[(int) floor(0.95 * ($latencies->count() - 1))],
            'documents' => [
                ...collect(DocumentStatus::cases())->mapWithKeys(fn (DocumentStatus $status): array => [$status->value => (int) ($documents[$status->value] ?? 0)])->all(),
                'stale' => KnowledgeDocument::query()->published()->where(fn ($q) => $q->whereNull('verified_at')->orWhere('verified_at', '<', now()->subDays($staleAfter)))->count(),
            ],
        ];
    }
}
