<?php

namespace App\Domain\DataImports\Actions;

use App\Domain\DataImports\Enums\ImportBatchStatus;
use App\Domain\DataImports\Enums\ImportStep;
use App\Domain\DataImports\Events\ImportBatchStarted;
use App\Domain\DataImports\Jobs\RunImportBatch;
use App\Domain\DataImports\Models\ImportBatch;
use App\Domain\DataImports\Support\AdapterRegistry;
use App\Domain\Identity\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Step 1 (Acquire): store the file with its source, version and usage terms,
 * create the batch, and queue the pipeline.
 */
final class StartImportBatchAction
{
    public function __construct(private readonly AdapterRegistry $adapters) {}

    public function fromUpload(UploadedFile $file, string $sourceName, ?string $sourceVersion, string $usageTerms, ?User $actor): ImportBatch
    {
        $this->adapters->kindOf($sourceName);
        $stored = $file->storeAs('imports', Str::ulid().'.csv', config('communitycare.imports.disk'));

        return $this->start((string) $stored, $file->getClientOriginalName(), $sourceName, $sourceVersion, $usageTerms, $actor);
    }

    /** Used by the CLI command for files already on this machine. */
    public function fromPath(string $localPath, string $sourceName, ?string $sourceVersion, string $usageTerms, ?User $actor): ImportBatch
    {
        $this->adapters->kindOf($sourceName);
        $stored = 'imports/'.Str::ulid().'.'.(strtolower(pathinfo($localPath, PATHINFO_EXTENSION)) === 'json' ? 'json' : 'csv');
        Storage::disk(config('communitycare.imports.disk'))->put($stored, (string) file_get_contents($localPath));

        return $this->start($stored, basename($localPath), $sourceName, $sourceVersion, $usageTerms, $actor);
    }

    private function start(string $storedPath, string $originalName, string $sourceName, ?string $sourceVersion, string $usageTerms, ?User $actor): ImportBatch
    {
        return DB::transaction(function () use ($storedPath, $originalName, $sourceName, $sourceVersion, $usageTerms, $actor): ImportBatch {
            $batch = ImportBatch::query()->create([
                'source_name' => $sourceName,
                'kind' => $this->adapters->kindOf($sourceName),
                'source_version' => $sourceVersion,
                'file_path' => $storedPath,
                'original_filename' => Str::limit($originalName, 250, ''),
                'usage_terms' => $usageTerms,
                'started_by' => $actor?->id,
                'status' => ImportBatchStatus::Queued,
                'current_step' => ImportStep::Acquire,
            ]);

            ImportBatchStarted::dispatch($batch->id, $batch->public_id, $sourceName, $sourceVersion, $actor?->id);
            RunImportBatch::dispatch($batch->id)->afterCommit();

            return $batch;
        });
    }
}
