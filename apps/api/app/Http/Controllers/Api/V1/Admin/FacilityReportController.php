<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Facilities\Events\FacilityReportHandled;
use App\Domain\Facilities\Models\FacilityReport;
use App\Domain\Identity\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Http\Support\ConsoleScope;
use App\Http\Support\Paginated;
use App\Http\Support\Time;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Reports from the public ("something on this page is wrong"). People who can edit a
 * facility see its reports and mark them fixed or dismissed; assigned-facility roles see
 * only their facilities. Follows the top-bar scope.
 */
final class FacilityReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->isActive() && $user->hasPermission(Permission::FacilitiesEdit), 403);

        $filters = $request->validate([
            'status' => ['nullable', Rule::in([FacilityReport::OPEN, FacilityReport::RESOLVED, FacilityReport::DISMISSED])],
            'facility_id' => ConsoleScope::FACILITY_RULE,
            'region_code' => ['nullable', 'digits:10'],
        ]);

        $scoped = fn (Builder $q) => $q
            ->unless($user->hasPermissionEverywhere(Permission::FacilitiesEdit), fn (Builder $q) => $q->whereHas('facility.staff', fn (Builder $s) => $s->whereKey($user->id)))
            ->when(ConsoleScope::facilityIds($filters['facility_id'] ?? null), fn (Builder $q, array $ids) => $q->whereHas('facility', fn (Builder $f) => $f->whereIn('public_id', $ids)))
            ->when($filters['region_code'] ?? null, fn (Builder $q, string $code) => $q->whereHas('facility.region', fn (Builder $r) => $r->where('psgc_code', $code)));

        $status = $filters['status'] ?? FacilityReport::OPEN;
        $reports = FacilityReport::query()
            ->with(['facility:id,public_id,name', 'resolver:id,name'])
            ->tap($scoped)
            ->where('status', $status)
            ->latest('id')
            ->paginate(Paginated::perPage($request));

        $counts = collect([FacilityReport::OPEN, FacilityReport::RESOLVED, FacilityReport::DISMISSED])
            ->mapWithKeys(fn (string $s) => [$s => FacilityReport::query()->tap($scoped)->where('status', $s)->count()]);

        return response()->json([
            'data' => $reports->getCollection()->map(fn (FacilityReport $report) => $this->present($report))->values(),
            'meta' => ['page' => $reports->currentPage(), 'per_page' => $reports->perPage(), 'total' => $reports->total(), 'last_page' => $reports->lastPage(), 'counts' => $counts],
        ]);
    }

    /** POST /admin/facility-reports/{report}/resolve | dismiss, with an optional note. */
    public function handle(Request $request, FacilityReport $report, string $action): JsonResponse
    {
        abort_unless($request->user()->isActive() && $request->user()->canAt(Permission::FacilitiesEdit, $report->facility), 403);
        abort_unless(in_array($action, ['resolve', 'dismiss'], true), 404);
        abort_if($report->status !== FacilityReport::OPEN, 409, 'This report was already handled.');
        $input = $request->validate(['note' => ['nullable', 'string', 'max:300']]);

        $status = $action === 'resolve' ? FacilityReport::RESOLVED : FacilityReport::DISMISSED;
        $report->update(['status' => $status, 'resolution_note' => $input['note'] ?? null, 'resolved_by' => $request->user()->id, 'resolved_at' => now()]);
        FacilityReportHandled::dispatch($report->public_id, $report->facility->public_id, $status, $request->user()->id, $input['note'] ?? null);

        return response()->json(['data' => $this->present($report->load(['facility:id,public_id,name', 'resolver:id,name']))]);
    }

    /** @return array<string, mixed> */
    private function present(FacilityReport $report): array
    {
        return [
            'id' => $report->public_id,
            'facility' => ['id' => $report->facility->public_id, 'name' => $report->facility->name],
            'reason' => ['value' => $report->reason, 'label' => FacilityReport::REASONS[$report->reason] ?? $report->reason],
            'details' => $report->details,
            'contact' => $report->contact,
            'status' => $report->status,
            'resolution_note' => $report->resolution_note,
            'resolved_by' => $report->resolver?->name,
            'resolved_at' => Time::iso($report->resolved_at),
            'created_at' => Time::iso($report->created_at),
        ];
    }
}
