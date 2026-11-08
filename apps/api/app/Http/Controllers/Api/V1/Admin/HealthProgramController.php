<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\HealthPrograms\Actions\ChangeProgramStatus;
use App\Domain\HealthPrograms\Actions\SaveHealthProgram;
use App\Domain\HealthPrograms\Enums\ProgramStatus;
use App\Domain\HealthPrograms\Models\HealthProgram;
use App\Http\Controllers\Controller;
use App\Http\Requests\Programs\SaveHealthProgramRequest;
use App\Http\Resources\AdminHealthProgramResource;
use App\Http\Support\ConsoleScope;
use App\Http\Support\Paginated;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

final class HealthProgramController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('manage-programs');

        $filters = $request->validate([
            'status' => ['nullable', Rule::enum(ProgramStatus::class)],
            'q' => ['nullable', 'string', 'max:120'],
            'facility_id' => ConsoleScope::FACILITY_RULE,
            'region_code' => ['nullable', 'digits:10'],
        ]);

        // The top-bar scope (one facility or one region) narrows both the list and the tab counts.
        $scoped = fn (Builder $q) => $q
            ->when(ConsoleScope::facilityIds($filters['facility_id'] ?? null), fn (Builder $q, array $ids) => $q->whereHas('facilities', fn (Builder $f) => $f->whereIn('public_id', $ids)))
            ->when($filters['region_code'] ?? null, fn (Builder $q, string $code) => $q->whereHas('facilities.region', fn (Builder $r) => $r->where('psgc_code', $code)));

        $programs = HealthProgram::query()
            ->withCount('facilities')
            ->tap($scoped)
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->where('status', $status))
            ->when($filters['q'] ?? null, fn (Builder $q, string $text) => $q->where('title', 'like', '%'.addcslashes($text, '%_\\').'%'))
            ->latest('starts_on')
            ->latest('id')
            ->paginate(Paginated::perPage($request));

        return Paginated::response($programs, AdminHealthProgramResource::class, $request, [
            'status_counts' => HealthProgram::query()->tap($scoped)->selectRaw('status, COUNT(*) AS total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }

    public function show(HealthProgram $program): JsonResponse
    {
        Gate::authorize('manage-programs');

        return $this->respond($program);
    }

    public function store(SaveHealthProgramRequest $request, SaveHealthProgram $save): JsonResponse
    {
        return $this->respond($save->handle(null, $request->fields(), $request->validated('facility_ids'), $request->user()), 201);
    }

    public function update(SaveHealthProgramRequest $request, HealthProgram $program, SaveHealthProgram $save): JsonResponse
    {
        return $this->respond($save->handle($program, $request->fields(), $request->validated('facility_ids'), $request->user()));
    }

    public function publish(Request $request, HealthProgram $program, ChangeProgramStatus $change): JsonResponse
    {
        Gate::authorize('manage-programs');

        return $this->respond($change->handle($program, ProgramStatus::Published, $request->user()));
    }

    public function archive(Request $request, HealthProgram $program, ChangeProgramStatus $change): JsonResponse
    {
        Gate::authorize('manage-programs');

        return $this->respond($change->handle($program, ProgramStatus::Archived, $request->user()));
    }

    private function respond(HealthProgram $program, int $status = 200): JsonResponse
    {
        $program->load(['facilities' => fn ($q) => $q->with(['cityMunicipality:id,name', 'region:id,name'])->orderBy('name')]);

        return response()->json(['data' => (new AdminHealthProgramResource($program))->resolve(request())], $status);
    }
}
