<?php

namespace Tests\Concerns;

use App\Domain\DataImports\Actions\StartImportBatchAction;
use App\Domain\DataImports\Models\ImportBatch;
use App\Domain\Identity\Models\User;

/**
 * Runs fixture files through the real pipeline. Tests use the sync queue, so
 * the queued RunImportBatch job runs as soon as the batch transaction commits.
 */
trait RunsImports
{
    protected function fixture(string $name): string
    {
        return base_path("tests/Fixtures/imports/{$name}");
    }

    protected function runImport(string $source, string $fixture, ?User $actor = null, ?string $version = 'test'): ImportBatch
    {
        $batch = app(StartImportBatchAction::class)->fromPath($this->fixture($fixture), $source, $version, 'Synthetic test data.', $actor);

        return $batch->refresh();
    }

    protected function importPsgc(): ImportBatch
    {
        return $this->runImport('psa_psgc', 'psgc_sample.csv', version: '2026-Q3');
    }
}
