<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\KnowledgeAssistant\Data\AssistantQuestion;
use App\Domain\KnowledgeAssistant\Queries\AssistantOverviewQuery;
use App\Domain\KnowledgeAssistant\Services\KnowledgeAssistantService;
use App\Domain\Settings\Contracts\SettingsRepository;
use App\Http\Controllers\Controller;
use App\Http\Requests\Assistant\AskAssistantRequest;
use App\Http\Resources\AssistantAnswerResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

final class AssistantController extends Controller
{
    public function overview(Request $request, AssistantOverviewQuery $overview, KnowledgeAssistantService $assistant, SettingsRepository $settings): JsonResponse
    {
        Gate::authorize('manage-knowledge');

        $configured = config('communitycare.assistant.provider');

        return response()->json(['data' => [
            'enabled' => $settings->bool('features.assistant.enabled'),
            'provider' => $assistant->providerName(),
            'configured_provider' => $configured,
            'model' => $assistant->providerName() === 'claude' ? config('communitycare.assistant.claude.model') : null,
            'provider_note' => $configured === 'claude' && $assistant->providerName() !== 'claude'
                ? 'ASSISTANT_PROVIDER is "claude" but ANTHROPIC_API_KEY is not set, so the grounded provider answers.'
                : null,
            ...$overview->get($request->integer('days', 30) ?: 30),
        ]]);
    }

    /** Test console: works while the public assistant is switched off. Logged as "preview". */
    public function preview(AskAssistantRequest $request, KnowledgeAssistantService $assistant): JsonResponse
    {
        Gate::authorize('manage-knowledge');

        $resource = new AssistantAnswerResource($assistant->ask($request->toQuestion('preview')));
        $resource->withDiagnostics = true;

        return response()->json(['data' => $resource->resolve($request)]);
    }

    /** Runs the guardrail cases through the safety screen and retrieval only; no model is called. */
    public function guardrails(KnowledgeAssistantService $assistant): JsonResponse
    {
        Gate::authorize('manage-knowledge');

        $results = array_map(function (array $case) use ($assistant): array {
            $actual = $assistant->screenOnly(new AssistantQuestion($case['question'], channel: 'guardrail'))->value;

            return [...$case, 'actual' => $actual, 'passed' => $actual === $case['expected']];
        }, config('communitycare.assistant.guardrail_cases', []));

        return response()->json([
            'data' => $results,
            'meta' => ['passed' => count(array_filter($results, fn (array $r): bool => $r['passed'])), 'total' => count($results)],
        ]);
    }
}
