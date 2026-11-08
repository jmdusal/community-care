<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\DataImports\Actions\DecideStagingRecordAction;
use App\Domain\DataImports\Enums\MatchStatus;
use App\Domain\DataImports\Enums\StagingDecision;
use App\Domain\DataImports\Models\ImportBatch;
use App\Domain\DataImports\Models\ImportStagingRecord;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\DecideImportRecordRequest;
use App\Http\Resources\ImportStagingRecordResource;
use App\Http\Support\Paginated;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

final class ImportRecordController extends Controller
{
    public function index(Request $request, ImportBatch $batch): JsonResponse
    {
        Gate::authorize('import-datasets');

        $filters = $request->validate([
            'flagged' => ['nullable', 'boolean'],
            'match_status' => ['nullable', Rule::enum(MatchStatus::class)],
            'decision' => ['nullable', Rule::enum(StagingDecision::class)],
        ]);

        $records = $batch->records()
            ->with(['matchedFacility:id,public_id,name,latitude,longitude', 'duplicateCandidates.facility:id,public_id,name'])
            ->when(isset($filters['flagged']), fn ($query) => $query->where('is_flagged', $request->boolean('flagged')))
            ->when($filters['match_status'] ?? null, fn ($query, string $status) => $query->where('match_status', $status))
            ->when($filters['decision'] ?? null, fn ($query, string $decision) => $query->where('decision', $decision))
            ->orderBy('row_number')
            ->paginate(Paginated::perPage($request, 25));

        return Paginated::response($records, ImportStagingRecordResource::class, $request);
    }

    public function decide(DecideImportRecordRequest $request, ImportBatch $batch, ImportStagingRecord $record, DecideStagingRecordAction $decide): ImportStagingRecordResource
    {
        $record = $decide->handle($record, $request->decision(), $request->validated('reason'), $request->user());

        return new ImportStagingRecordResource($record->load(['matchedFacility:id,public_id,name,latitude,longitude', 'duplicateCandidates.facility:id,public_id,name']));
    }
}
