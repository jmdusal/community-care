<?php

namespace App\Console\Commands;

use App\Domain\DataImports\Actions\StartImportBatchAction;
use App\Domain\DataImports\Models\ImportBatch;
use App\Domain\DataImports\Support\AdapterRegistry;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('communitycare:import {source : Source key, e.g. psa_psgc or doh_nhfr} {file : Path to the CSV file} {--source-version= : Release or export date} {--terms= : Usage terms of the file} {--sync : Process now instead of on the queue}')]
#[Description('Import a PSGC or facility CSV file through the staging pipeline')]
final class ImportFileCommand extends Command
{
    public function handle(StartImportBatchAction $startImport, AdapterRegistry $adapters): int
    {
        $file = (string) $this->argument('file');
        $source = (string) $this->argument('source');

        if (! is_readable($file)) {
            $this->error("Cannot read {$file}.");

            return self::FAILURE;
        }

        if (! in_array($source, array_column($adapters->describe(), 'key'), true)) {
            $this->error("Unknown source [{$source}]. Available: ".implode(', ', array_column($adapters->describe(), 'key')));

            return self::FAILURE;
        }

        if ($this->option('sync')) {
            config(['queue.default' => 'sync']);
        }

        $batch = $startImport->fromPath(
            $file,
            $source,
            $this->option('source-version'),
            (string) ($this->option('terms') ?: 'Imported from the command line; see the source publisher for usage terms.'),
            null,
        );

        $batch = ImportBatch::query()->findOrFail($batch->id);

        $this->info("Batch {$batch->public_id}: {$batch->status->value}");
        if ($batch->counts !== null) {
            $this->table(array_keys($batch->counts), [array_values($batch->counts)]);
        }
        if ($batch->error_summary !== null) {
            $this->error($batch->error_summary);
        }

        return self::SUCCESS;
    }
}
