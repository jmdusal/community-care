<?php

namespace App\Domain\DataImports\Actions;

use App\Domain\DataImports\Enums\ImportBatchStatus;
use App\Domain\DataImports\Enums\StagingDecision;
use App\Domain\DataImports\Events\ImportRecordDecided;
use App\Domain\DataImports\Exceptions\ImportNotReady;
use App\Domain\DataImports\Models\ImportStagingRecord;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;

/** Step 6 (Review): a reviewer approves or rejects one staged record. */
final class DecideStagingRecordAction
{
    public function handle(ImportStagingRecord $record, StagingDecision $decision, ?string $reason, User $reviewer): ImportStagingRecord
    {
        $batch = $record->batch;

        if (! $batch->status->canBeReviewed()) {
            throw ImportNotReady::status($batch->status->value);
        }

        return DB::transaction(function () use ($record, $decision, $reason, $reviewer, $batch): ImportStagingRecord {
            $record->update([
                'decision' => $decision,
                'decision_reason' => $reason,
                'decided_by' => $reviewer->id,
                'decided_at' => now(),
            ]);

            $record->duplicateCandidates()->update([
                'resolution' => $decision === StagingDecision::Approved ? 'not_duplicate' : 'duplicate',
                'resolved_by' => $reviewer->id,
                'resolved_at' => now(),
            ]);

            if ($batch->status === ImportBatchStatus::NeedsReview && StageFacilityRecordsAction::pendingFlaggedCount($batch) === 0) {
                $batch->update(['status' => ImportBatchStatus::ReadyToPublish]);
            }

            ImportRecordDecided::dispatch(
                $record->id,
                $batch->public_id,
                $record->source_record_id,
                $decision->value,
                $reason,
                array_column($record->flags ?? [], 'code'),
                $reviewer->id,
            );

            return $record->refresh();
        });
    }
}
