<?php

namespace Database\Seeders;

use App\Domain\DataImports\Actions\StartImportBatchAction;
use App\Domain\DataImports\Actions\SyncGeographyAction;
use App\Domain\DataImports\Models\ImportBatch;
use App\Domain\Geography\Models\Barangay;
use App\Domain\Geography\Models\Region;
use Illuminate\Database\Seeder;
use Throwable;

/**
 * Every Philippine region, province, city/municipality and barangay (PSGC), so a fresh
 * install never needs places typed in.
 *
 * 1. Downloads the full list from the public PSGC API (about 44,000 places, ~90 seconds).
 *    Skipped when the database already has it; set PSGC_SEED_REFRESH=true to download again.
 * 2. If PSA's official PSGC file is saved as CSV at communitycare.imports.geography_sources
 *    .psa_psgc.seed_file, imports it too, adding places the API does not list yet.
 *
 * Both run as normal audited import batches. Offline? It warns and carries on; run
 * `php artisan communitycare:sync-geography --sync` later.
 */
class GeographySeeder extends Seeder
{
    /** A complete list has 17 regions and roughly 42,000 barangays. */
    private const COMPLETE_REGIONS = 17;

    private const COMPLETE_BARANGAYS = 40000;

    public function run(SyncGeographyAction $sync, StartImportBatchAction $startImport): void
    {
        // Imports normally run on the queue; while seeding they run immediately.
        config(['queue.default' => 'sync']);

        $this->syncFromApi($sync);
        $this->importPsaFile($startImport);

        $this->command?->info(sprintf('Places in the database: %d regions, %d barangays.', Region::query()->count(), Barangay::query()->count()));
    }

    private function syncFromApi(SyncGeographyAction $sync): void
    {
        $complete = Region::query()->count() >= self::COMPLETE_REGIONS && Barangay::query()->count() >= self::COMPLETE_BARANGAYS;

        if ($complete && ! filter_var(env('PSGC_SEED_REFRESH', false), FILTER_VALIDATE_BOOLEAN)) {
            $this->command?->info('PSGC places are already loaded. Skipping the download (set PSGC_SEED_REFRESH=true to refresh).');

            return;
        }

        $this->command?->info('Downloading all Philippine places from the PSGC API (about 90 seconds)…');

        try {
            $batch = ImportBatch::query()->findOrFail($sync->handle(null)->id);
            $this->command?->info("PSGC API import: {$batch->status->value}, ".json_encode($batch->counts));
        } catch (Throwable $exception) {
            $this->command?->warn('Could not download the PSGC list: '.$exception->getMessage());
            $this->command?->warn('Seeding continues. Load places later with: php artisan communitycare:sync-geography --sync');
        }
    }

    private function importPsaFile(StartImportBatchAction $startImport): void
    {
        $file = (string) config('communitycare.imports.geography_sources.psa_psgc.seed_file');

        if ($file === '' || ! is_readable($file)) {
            return;
        }

        $this->command?->info("Importing PSA's PSGC file: {$file}");

        try {
            $batch = ImportBatch::query()->findOrFail($startImport->fromPath(
                $file,
                'psa_psgc',
                'psa-file-'.date('Y-m-d', (int) filemtime($file)),
                'Philippine Standard Geographic Code, Philippine Statistics Authority (official publication).',
                null,
            )->id);
            $this->command?->info("PSA file import: {$batch->status->value}, ".json_encode($batch->counts));
        } catch (Throwable $exception) {
            $this->command?->warn("Could not import {$file}: ".$exception->getMessage());
        }
    }
}
