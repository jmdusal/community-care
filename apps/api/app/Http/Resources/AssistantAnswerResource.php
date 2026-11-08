<?php

namespace App\Http\Resources;

use App\Domain\KnowledgeAssistant\Data\AssistantAnswer;
use App\Domain\KnowledgeAssistant\Data\SourceItem;
use App\Http\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property AssistantAnswer $resource */
final class AssistantAnswerResource extends JsonResource
{
    /** Shown in the admin test console only. */
    public bool $withDiagnostics = false;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $answer = $this->resource;

        return [
            'outcome' => $answer->outcome->value,
            'answer' => $answer->text,
            'citations' => array_map(fn (SourceItem $item): array => [
                'key' => $item->key,
                'type' => $item->type,
                'id' => $item->id,
                'title' => $item->title,
                'url' => $item->url,
                'verified_at' => Time::iso($item->verifiedAt),
                'is_stale' => $item->isStale,
            ], $answer->citations),
            'notice' => AssistantAnswer::NOTICE,
            'provider' => $this->when($this->withDiagnostics, $answer->provider),
            'used_fallback' => $this->when($this->withDiagnostics, $answer->usedFallback),
        ];
    }
}
