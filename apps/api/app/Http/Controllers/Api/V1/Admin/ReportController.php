<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Analytics\Queries\ReportsQuery;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Geography\Models\Region;
use App\Http\Controllers\Controller;
use App\Http\Support\ConsoleScope;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * GET /admin/reports?from=&to=&facility_id=&region_code=
 * GET /admin/reports/export?dataset=appointments|facilities|daily (CSV)
 *
 * System admins and verifiers report on everything; facility admins on their assigned
 * facilities only. The top-bar scope narrows it, checked on the server.
 */
final class ReportController extends Controller
{
    public function index(Request $request, ReportsQuery $reports): JsonResponse
    {
        [$from, $to, $facilityIds, $regionId] = $this->scope($request);

        return response()->json(['data' => $reports->handle($from, $to, $facilityIds, $regionId)]);
    }

    public function export(Request $request, ReportsQuery $reports): StreamedResponse
    {
        Gate::authorize('view-reports');
        $dataset = $request->validate(['dataset' => ['required', Rule::in(['appointments', 'facilities', 'daily'])]])['dataset'];
        [$from, $to, $facilityIds, $regionId] = $this->scope($request);

        $rows = match ($dataset) {
            'appointments' => $reports->appointmentRows($from, $to, $facilityIds, $regionId),
            'facilities' => $reports->facilityRows($from, $to, $facilityIds, $regionId),
            'daily' => collect($reports->handle($from, $to, $facilityIds, $regionId)['by_day']),
        };

        $filename = "communitycare-{$dataset}-{$from->toDateString()}-to-{$to->toDateString()}.csv";

        return response()->streamDownload(function () use ($rows): void {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // so Excel reads Filipino names (ñ) correctly
            $header = false;
            foreach ($rows as $row) {
                if (! $header) {
                    fputcsv($out, array_keys($row), escape: '');
                    $header = true;
                }
                // Neutralise spreadsheet formulas in text cells (CSV injection).
                fputcsv($out, array_map(fn ($v) => is_string($v) && preg_match('/^[=+\-@\t\r]/', $v) === 1 ? "'".$v : $v, $row), escape: '');
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable, 2: list<int>|null, 3: int|null} */
    private function scope(Request $request): array
    {
        Gate::authorize('view-reports');
        $input = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'facility_id' => ConsoleScope::FACILITY_RULE,
            'region_code' => ['nullable', 'digits:10'],
        ]);

        $tz = (string) config('communitycare.display_timezone');
        $to = CarbonImmutable::parse($input['to'] ?? now($tz)->toDateString(), $tz);
        $from = CarbonImmutable::parse($input['from'] ?? $to->subDays(29)->toDateString(), $tz);
        if ($from->diffInDays($to) > 366) {
            $from = $to->subDays(366);
        }

        $user = $request->user();
        $facilityIds = $user->seesAllFacilities() ? null : $user->facilities()->pluck('facilities.id')->all();

        if (($ids = ConsoleScope::facilityIds($input['facility_id'] ?? null)) !== null) {
            $chosen = Facility::query()->whereIn('public_id', $ids)->get();
            abort_if($chosen->count() !== count($ids), 404);
            $chosen->each(fn (Facility $facility) => Gate::authorize('view', $facility));
            $facilityIds = $chosen->pluck('id')->all();
        }

        $regionId = isset($input['region_code']) ? Region::query()->where('psgc_code', $input['region_code'])->firstOrFail()->id : null;

        return [$from, $to, $facilityIds, $regionId];
    }
}
