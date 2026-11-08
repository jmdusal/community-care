<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\KnowledgeAssistant\Actions\ChangeDocumentStatus;
use App\Domain\KnowledgeAssistant\Actions\SaveKnowledgeDocument;
use App\Domain\KnowledgeAssistant\Enums\DocumentStatus;
use App\Domain\KnowledgeAssistant\Models\KnowledgeDocument;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveKnowledgeDocumentRequest;
use App\Http\Resources\KnowledgeDocumentResource;
use App\Http\Support\Paginated;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

final class KnowledgeDocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('manage-knowledge');

        $filters = $request->validate([
            'status' => ['nullable', Rule::enum(DocumentStatus::class)],
            'q' => ['nullable', 'string', 'max:120'],
        ]);

        $documents = KnowledgeDocument::query()
            ->with('editor:id,name')
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->where('status', $status))
            ->when($filters['q'] ?? null, fn (Builder $q, string $text) => $q->where(fn (Builder $w) => $w
                ->where('title', 'like', '%'.addcslashes($text, '%_\\').'%')
                ->orWhere('topic', 'like', '%'.addcslashes($text, '%_\\').'%')))
            ->latest('updated_at')
            ->latest('id')
            ->paginate(Paginated::perPage($request));

        return Paginated::response($documents, KnowledgeDocumentResource::class, $request);
    }

    public function show(KnowledgeDocument $document): JsonResponse
    {
        Gate::authorize('manage-knowledge');

        return response()->json(['data' => new KnowledgeDocumentResource($document->load('editor:id,name'))]);
    }

    public function store(SaveKnowledgeDocumentRequest $request, SaveKnowledgeDocument $save): JsonResponse
    {
        $document = $save->handle(null, $request->validated(), $request->user());

        return response()->json(['data' => new KnowledgeDocumentResource($document->load('editor:id,name'))], 201);
    }

    public function update(SaveKnowledgeDocumentRequest $request, KnowledgeDocument $document, SaveKnowledgeDocument $save): JsonResponse
    {
        $document = $save->handle($document, $request->validated(), $request->user());

        return response()->json(['data' => new KnowledgeDocumentResource($document->load('editor:id,name'))]);
    }

    public function publish(Request $request, KnowledgeDocument $document, ChangeDocumentStatus $change): JsonResponse
    {
        Gate::authorize('manage-knowledge');

        return response()->json(['data' => new KnowledgeDocumentResource($change->handle($document, DocumentStatus::Published, $request->user())->load('editor:id,name'))]);
    }

    public function archive(Request $request, KnowledgeDocument $document, ChangeDocumentStatus $change): JsonResponse
    {
        Gate::authorize('manage-knowledge');

        return response()->json(['data' => new KnowledgeDocumentResource($change->handle($document, DocumentStatus::Archived, $request->user())->load('editor:id,name'))]);
    }
}
