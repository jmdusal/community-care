<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Domain\KnowledgeAssistant\Exceptions\AssistantDisabled;
use App\Domain\KnowledgeAssistant\Services\KnowledgeAssistantService;
use App\Domain\Settings\Contracts\SettingsRepository;
use App\Http\Controllers\Controller;
use App\Http\Requests\Assistant\AskAssistantRequest;
use App\Http\Resources\AssistantAnswerResource;
use Illuminate\Http\JsonResponse;

final class AssistantController extends Controller
{
    public function __construct(private readonly SettingsRepository $settings) {}

    /** Lets clients hide the assistant entry point when it is switched off. */
    public function status(): JsonResponse
    {
        return response()->json(['data' => ['enabled' => $this->settings->bool('features.assistant.enabled')]]);
    }

    public function ask(AskAssistantRequest $request, KnowledgeAssistantService $assistant): JsonResponse
    {
        if (! $this->settings->bool('features.assistant.enabled')) {
            throw new AssistantDisabled;
        }

        return response()->json(['data' => (new AssistantAnswerResource($assistant->ask($request->toQuestion('public'))))->resolve($request)]);
    }
}
