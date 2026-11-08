<?php

namespace App\Console\Commands;

use App\Domain\DataImports\Actions\SyncGeographyAction;
use App\Domain\DataImports\Models\ImportBatch;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Throwable;

#[Signature('communitycare:sync-geography {--sync : Import now instead of on the queue}')]
#[Description('Fetch all Philippine regions, provinces, cities/municipalities and barangays (PSGC) and import them')]
final class SyncGeographyCommand extends Command
{
    public function handle(SyncGeographyAction $sync): int
    {
        if ($this->option('sync')) {
            config(['queue.default' => 'sync']);
        }

        $this->info('Downloading the PSGC list (about 44,000 places)…');

        try {
            $batch = ImportBatch::query()->findOrFail($sync->handle(null)->id);
        } catch (Throwable $exception) {
            $this->error('PSGC sync failed: '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->info("Batch {$batch->public_id}: {$batch->status->value}");
        if ($batch->counts !== null) {
            $this->table(array_keys($batch->counts), [array_values($batch->counts)]);
        }

        return self::SUCCESS;
    }
}
