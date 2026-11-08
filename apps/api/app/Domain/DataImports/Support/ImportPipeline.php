<?php

namespace App\Domain\DataImports\Support;

use App\Domain\DataImports\Actions\ImportGeographyAction;
use App\Domain\DataImports\Actions\StageFacilityRecordsAction;
use App\Domain\DataImports\Enums\ImportBatchStatus;
use App\Domain\DataImports\Enums\ImportKind;
use App\Domain\DataImports\Events\ImportBatchFailed;
use App\Domain\DataImports\Exceptions\ImportFileInvalid;
use App\Domain\DataImports\Models\ImportBatch;
use Throwable;

/** Runs a queued batch through the steps for its kind and records failures. */
final class ImportPipeline
{
    public function __construct(
        private readonly StageFacilityRecordsAction $stageFacilities,
        private readonly ImportGeographyAction $importGeography,
    ) {}

    public function run(ImportBatch $batch): void
    {
        if ($batch->status !== ImportBatchStatus::Queued) {
            return;
        }

        try {
            match ($batch->kind) {
                ImportKind::Facilities => $this->stageFacilities->handle($batch),
                ImportKind::Geography => $this->importGeography->handle($batch),
            };
        } catch (ImportFileInvalid $exception) {
            $this->markFailed($batch, $exception->getMessage());
        } catch (Throwable $exception) {
            report($exception);
            $this->markFailed($batch, 'Unexpected error while processing the file. The error has been logged; published data was not changed.');
        }
    }

    public function markFailed(ImportBatch $batch, string $reason): void
    {
        $batch->update([
            'status' => ImportBatchStatus::Failed,
            'error_summary' => $reason,
            'finished_at' => now(),
        ]);

        ImportBatchFailed::dispatch($batch->id, $batch->public_id, $reason);
    }
}
