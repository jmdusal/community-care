<?php

namespace App\Domain\KnowledgeAssistant\Models;

use App\Domain\KnowledgeAssistant\Enums\AnswerOutcome;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/** Outcome and latency of one question. The question text is never stored. */
#[Fillable(['channel', 'outcome', 'provider', 'latency_ms', 'citation_count', 'used_fallback', 'created_at'])]
class AssistantInteraction extends Model
{
    public const UPDATED_AT = null;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'outcome' => AnswerOutcome::class,
            'used_fallback' => 'boolean',
            'created_at' => 'datetime',
        ];
    }
}
