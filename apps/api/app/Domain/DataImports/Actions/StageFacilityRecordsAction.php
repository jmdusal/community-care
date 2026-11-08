<?php

namespace App\Domain\DataImports\Actions;

use App\Domain\DataImports\Enums\ImportBatchStatus;
use App\Domain\DataImports\Enums\ImportFlag;
use App\Domain\DataImports\Enums\ImportStep;
use App\Domain\DataImports\Enums\MatchStatus;
use App\Domain\DataImports\Enums\StagingDecision;
use App\Domain\DataImports\Events\ImportBatchStaged;
use App\Domain\DataImports\Matching\FacilityMatcherFactory;
use App\Domain\DataImports\Models\DuplicateCandidate;
use App\Domain\DataImports\Models\ImportBatch;
use App\Domain\DataImports\Models\ImportStagingRecord;
use App\Domain\DataImports\Support\AdapterRegistry;
use App\Domain\Geography\Support\GeographyLookup;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Steps 2-5 (Stage, Normalize, Match, Flag). Writes only to staging tables:
 * published facility data is never touched here.
 */
final class StageFacilityRecordsAction
{
    private const CHUNK = 500;

    public function __construct(
        private readonly AdapterRegistry $adapters,
        private readonly FacilityMatcherFactory $matchers,
    ) {}

    public function handle(ImportBatch $batch): void
    {
        $adapter = $this->adapters->facilityAdapter($batch->source_name);
        $path = Storage::disk(config('communitycare.imports.disk'))->path($batch->file_path);
        $matcher = $this->matchers->forSource($batch->source_name, new GeographyLookup);

        $batch->update(['status' => ImportBatchStatus::Running, 'current_step' => ImportStep::Match, 'started_at' => now()]);

        $counts = ['total' => 0, 'new' => 0, 'updated' => 0, 'unchanged' => 0, 'invalid' => 0, 'flagged' => 0, 'duplicates' => 0, 'conflicts' => 0];

        DB::beginTransaction();
        try {
            foreach ($adapter->read($path) as $record) {
                $result = $matcher->evaluate($record);

                $staging = ImportStagingRecord::query()->create([
                    'import_batch_id' => $batch->id,
                    'row_number' => $record->rowNumber,
                    'source_record_id' => $result->record->sourceRecordId,
                    'payload' => $result->record->toArray(),
                    'match_status' => $result->status,
                    'matched_facility_id' => $result->matchedFacilityId,
                    'flags' => $result->flags === [] ? null : $result->flags,
                    'is_flagged' => $result->isFlagged(),
                    'decision' => StagingDecision::Pending,
                ]);

                foreach ($result->duplicates as $duplicate) {
                    DuplicateCandidate::query()->create([
                        'import_batch_id' => $batch->id,
                        'staging_record_id' => $staging->id,
                        ...$duplicate,
                    ]);
                }

                $counts['total']++;
                $counts[$result->status->value]++;
                $counts['flagged'] += (int) $result->isFlagged();
                $counts['duplicates'] += (int) $result->has(ImportFlag::DuplicateCandidate);
                $counts['conflicts'] += (int) $result->has(ImportFlag::CoordinateConflict);

                if ($counts['total'] % self::CHUNK === 0) {
                    DB::commit();
                    $batch->update(['records_processed' => $counts['total']]);
                    DB::beginTransaction();
                }
            }

            DB::commit();
        } catch (\Throwable $exception) {
            DB::rollBack();
            throw $exception;
        }

        $batch->update([
            'status' => $counts['flagged'] > 0 ? ImportBatchStatus::NeedsReview : ImportBatchStatus::ReadyToPublish,
            'current_step' => ImportStep::Review,
            'records_processed' => $counts['total'],
            'counts' => $counts,
            'finished_at' => now(),
        ]);

        ImportBatchStaged::dispatch($batch->id, $batch->public_id, $counts);
    }

    /** Re-reads staging so a resumed or partially reviewed batch reports accurate numbers. */
    public static function pendingFlaggedCount(ImportBatch $batch): int
    {
        return $batch->records()
            ->where('is_flagged', true)
            ->where('decision', StagingDecision::Pending)
            ->whereIn('match_status', [MatchStatus::New, MatchStatus::Updated])
            ->count();
    }
}
