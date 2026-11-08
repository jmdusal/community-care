<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\DataImports\Actions\PublishImportBatchAction;
use App\Domain\DataImports\Actions\StageFacilityRecordsAction;
use App\Domain\DataImports\Actions\StartImportBatchAction;
use App\Domain\DataImports\Models\ImportBatch;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StartImportRequest;
use App\Http\Resources\ImportBatchResource;
use App\Http\Support\Paginated;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

final class ImportBatchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('import-datasets');

        $batches = ImportBatch::query()
            ->with(['starter:id,name', 'publisher:id,name'])
            ->latest('id')
            ->paginate(Paginated::perPage($request));

        return Paginated::response($batches, ImportBatchResource::class, $request);
    }

    public function store(StartImportRequest $request, StartImportBatchAction $startImport): JsonResponse
    {
        $batch = $startImport->fromUpload(
            $request->file('file'),
            $request->validated('source'),
            $request->validated('source_version'),
            $request->validated('usage_terms'),
            $request->user(),
        );

        return (new ImportBatchResource($batch->load('starter:id,name')))->response()->setStatusCode(202);
    }

    public function show(ImportBatch $batch): ImportBatchResource
    {
        Gate::authorize('import-datasets');

        $batch->load(['starter:id,name', 'publisher:id,name']);
        $batch->setAttribute('pending_flagged', StageFacilityRecordsAction::pendingFlaggedCount($batch));

        return new ImportBatchResource($batch);
    }

    public function publish(Request $request, ImportBatch $batch, PublishImportBatchAction $publish): JsonResponse
    {
        Gate::authorize('review-imports');

        $result = $publish->handle($batch, $request->user());

        return (new ImportBatchResource($batch->refresh()->load(['starter:id,name', 'publisher:id,name'])))
            ->additional(['meta' => ['result' => $result]])
            ->response();
    }
}
