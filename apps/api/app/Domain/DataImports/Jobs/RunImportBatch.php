<?php

namespace App\Domain\DataImports\Jobs;

use App\Domain\DataImports\Enums\ImportBatchStatus;
use App\Domain\DataImports\Models\ImportBatch;
use App\Domain\DataImports\Support\ImportPipeline;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

/**
 * Runs once (no retries): a half-processed batch is marked failed and the user
 * starts a new one. Timeout stays below the queue's retry_after (330 s).
 */
final class RunImportBatch implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 300;

    public function __construct(public readonly int $batchId) {}

    public function handle(ImportPipeline $pipeline): void
    {
        $batch = ImportBatch::query()->find($this->batchId);

        if ($batch !== null) {
            $pipeline->run($batch);
        }
    }

    public function failed(?Throwable $exception): void
    {
        $batch = ImportBatch::query()->find($this->batchId);

        if ($batch !== null && $batch->status !== ImportBatchStatus::Failed) {
            app(ImportPipeline::class)->markFailed($batch, 'The import job stopped before finishing (timeout or worker error).');
        }
    }
}
