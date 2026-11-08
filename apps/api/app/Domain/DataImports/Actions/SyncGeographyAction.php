<?php

namespace App\Domain\DataImports\Actions;

use App\Domain\DataImports\Models\ImportBatch;
use App\Domain\DataImports\Support\PsgcApiClient;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\File;

/**
 * Fetches every region, province, city/municipality and barangay from the
 * PSGC API and runs them through the normal geography import (an audited
 * batch on the Imports screen). Existing places are updated by PSGC code, so
 * facilities keep their links.
 */
final class SyncGeographyAction
{
    public const SOURCE = 'psgc_api';

    public function __construct(private readonly StartImportBatchAction $startImport) {}

    public function handle(?User $actor): ImportBatch
    {
        $client = new PsgcApiClient((string) config('communitycare.imports.geography_sources.'.self::SOURCE.'.base_url'));
        $snapshot = $client->snapshot();

        $path = storage_path('app/private/psgc-snapshot-'.now()->format('YmdHis').'.json');
        File::ensureDirectoryExists(dirname($path));
        File::put($path, json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

        try {
            return $this->startImport->fromPath(
                $path,
                self::SOURCE,
                $snapshot['release'],
                'Philippine Standard Geographic Code by the Philippine Statistics Authority, fetched from '.$snapshot['source'].'.',
                $actor,
            );
        } finally {
            File::delete($path);
        }
    }
}
