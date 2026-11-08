<?php

namespace App\Domain\KnowledgeAssistant\Actions;

use App\Domain\Identity\Models\User;
use App\Domain\KnowledgeAssistant\Enums\DocumentStatus;
use App\Domain\KnowledgeAssistant\Events\KnowledgeDocumentChanged;
use App\Domain\KnowledgeAssistant\Exceptions\DocumentNotPublishable;
use App\Domain\KnowledgeAssistant\Models\KnowledgeDocument;
use Illuminate\Support\Facades\DB;

/** Publishes (makes quotable by the assistant) or archives a document. */
final class ChangeDocumentStatus
{
    public function handle(KnowledgeDocument $document, DocumentStatus $status, User $actor): KnowledgeDocument
    {
        if ($status === DocumentStatus::Published && $document->verified_at === null) {
            throw DocumentNotPublishable::notVerified();
        }

        if ($document->status === $status) {
            return $document;
        }

        return DB::transaction(function () use ($document, $status, $actor): KnowledgeDocument {
            $before = ['status' => $document->status->value];

            $document->forceFill([
                'status' => $status,
                'published_at' => $status === DocumentStatus::Published ? now() : $document->published_at,
                'updated_by' => $actor->id,
            ])->save();

            KnowledgeDocumentChanged::dispatch($status->value, $document->public_id, $actor->id, $before, ['status' => $status->value]);

            return $document;
        });
    }
}
