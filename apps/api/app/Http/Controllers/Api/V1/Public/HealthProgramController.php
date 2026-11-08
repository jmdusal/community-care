<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Domain\HealthPrograms\Enums\ProgramCategory;
use App\Domain\HealthPrograms\Models\HealthProgram;
use App\Http\Controllers\Controller;
use App\Http\Resources\HealthProgramResource;
use App\Http\Support\Paginated;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Published programs that have not ended, newest start first. */
final class HealthProgramController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'category' => ['nullable', Rule::enum(ProgramCategory::class)],
            'region_code' => ['nullable', 'digits:10'],
        ]);

        $programs = HealthProgram::query()
            ->current()
            ->withCount(['facilities' => fn (Builder $q) => $q->where('publication_status', 'published')])
            ->when($filters['category'] ?? null, fn (Builder $q, string $category) => $q->where('category', $category))
            ->when($filters['region_code'] ?? null, fn (Builder $q, string $code) => $q->whereHas('facilities.region', fn (Builder $r) => $r->where('psgc_code', $code)))
            ->orderBy('starts_on')
            ->paginate(Paginated::perPage($request));

        return Paginated::response($programs, HealthProgramResource::class, $request);
    }

    public function show(HealthProgram $program): JsonResponse
    {
        abort_unless($program->status->value === 'published', 404);

        return response()->json(['data' => new HealthProgramResource($program->load(['facilities' => fn ($q) => $q->with(['cityMunicipality:id,name', 'region:id,name'])->orderBy('name')]))]);
    }
}
