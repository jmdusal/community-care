<?php

namespace App\Domain\KnowledgeAssistant\Actions;

use App\Domain\Identity\Models\User;
use App\Domain\KnowledgeAssistant\Enums\DocumentStatus;
use App\Domain\KnowledgeAssistant\Events\KnowledgeDocumentChanged;
use App\Domain\KnowledgeAssistant\Models\KnowledgeDocument;
use Illuminate\Support\Facades\DB;

/**
 * Creates or edits a document. Editing a published document keeps it
 * published but requires a fresh verified date: the content changed.
 */
final class SaveKnowledgeDocument
{
    /** Fields recorded in the audit log (the body is summarised by length). */
    private const AUDITED = ['title', 'topic', 'source_name', 'source_url', 'status', 'verified_at'];

    /** @param array{title: string, body: string, topic?: string|null, source_name: string, source_url?: string|null, verified_at?: string|null} $data */
    public function handle(?KnowledgeDocument $document, array $data, User $actor): KnowledgeDocument
    {
        return DB::transaction(function () use ($document, $data, $actor): KnowledgeDocument {
            $creating = $document === null;
            $document ??= new KnowledgeDocument(['created_by' => $actor->id, 'status' => DocumentStatus::Draft]);
            $before = $creating ? null : $this->snapshot($document);

            $document->fill([...$data, 'updated_by' => $actor->id])->save();

            $after = $this->snapshot($document);
            if (! $creating && $before == $after) {
                return $document;
            }

            KnowledgeDocumentChanged::dispatch($creating ? 'created' : 'updated', $document->public_id, $actor->id, $before, $after);

            return $document;
        });
    }

    /** @return array<string, mixed> */
    private function snapshot(KnowledgeDocument $document): array
    {
        $values = [];
        foreach (self::AUDITED as $field) {
            $value = $document->getAttribute($field);
            $values[$field] = $value instanceof \BackedEnum ? $value->value : ($value instanceof \DateTimeInterface ? $value->format(DATE_ATOM) : $value);
        }

        return [...$values, 'body_length' => mb_strlen((string) $document->body), 'body_hash' => substr(hash('sha256', (string) $document->body), 0, 12)];
    }
}
