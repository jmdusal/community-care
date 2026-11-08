<?php

namespace App\Domain\DataImports\Actions;

use App\Domain\DataImports\Enums\ImportBatchStatus;
use App\Domain\DataImports\Enums\ImportKind;
use App\Domain\DataImports\Enums\ImportStep;
use App\Domain\DataImports\Enums\MatchStatus;
use App\Domain\DataImports\Events\ImportBatchPublished;
use App\Domain\DataImports\Exceptions\ImportNotReady;
use App\Domain\DataImports\Models\ImportBatch;
use App\Domain\DataImports\Models\ImportStagingRecord;
use App\Domain\Facilities\Contracts\FacilityWriter;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Step 7 (Publish): writes approved staged records to the directory in one
 * transaction, so a failure leaves published data exactly as it was.
 */
final class PublishImportBatchAction
{
    public function __construct(private readonly FacilityWriter $facilities) {}

    /** @return array{created: int, updated: int, unchanged: int, skipped: int} */
    public function handle(ImportBatch $batch, User $publisher): array
    {
        if ($batch->kind !== ImportKind::Facilities || ! $batch->status->canBeReviewed()) {
            throw ImportNotReady::status($batch->status->value);
        }

        $pending = StageFacilityRecordsAction::pendingFlaggedCount($batch);
        if ($pending > 0) {
            throw ImportNotReady::pendingFlags($pending);
        }

        $result = DB::transaction(function () use ($batch, $publisher): array {
            $result = ['created' => 0, 'updated' => 0, 'unchanged' => 0, 'skipped' => 0];

            $batch->records()->chunkById(500, function ($records) use ($batch, $publisher, &$result): void {
                /** @var ImportStagingRecord $staging */
                foreach ($records as $staging) {
                    if ($staging->match_status === MatchStatus::Unchanged && $staging->source_record_id !== null) {
                        $this->facilities->touchSource($batch->source_name, $staging->source_record_id);
                        $result['unchanged']++;

                        continue;
                    }

                    if (! $staging->isPublishable()) {
                        $result['skipped']++;

                        continue;
                    }

                    $this->facilities->applyImportedRecord($staging->record(), $batch->source_name, $staging->matched_facility_id, $publisher->id);
                    $result[$staging->match_status === MatchStatus::New ? 'created' : 'updated']++;
                }
            });

            $batch->update([
                'status' => ImportBatchStatus::Published,
                'current_step' => ImportStep::Publish,
                'published_at' => now(),
                'published_by' => $publisher->id,
            ]);

            ImportBatchPublished::dispatch($batch->id, $batch->public_id, $result, $publisher->id);

            return $result;
        });

        return $result;
    }
}
