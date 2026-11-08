<?php

namespace App\Http\Resources;

use App\Domain\KnowledgeAssistant\Models\KnowledgeDocument;
use App\Domain\Settings\Contracts\SettingsRepository;
use App\Http\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin KnowledgeDocument */
final class KnowledgeDocumentResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->public_id,
            'title' => $this->title,
            'body' => $this->body,
            'topic' => $this->topic,
            'source_name' => $this->source_name,
            'source_url' => $this->source_url,
            'status' => $this->status->value,
            'verified_at' => Time::iso($this->verified_at),
            'is_stale' => $this->isStale(app(SettingsRepository::class)->int('verification.stale_after_days')),
            'published_at' => Time::iso($this->published_at),
            'updated_at' => Time::iso($this->updated_at),
            'updated_by' => $this->whenLoaded('editor', fn () => $this->editor?->name),
        ];
    }
}
