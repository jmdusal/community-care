<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Facilities\Events\FacilityTodayUpdated;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityDayStatus;
use App\Domain\Facilities\Support\FacilitySnapshot;
use App\Domain\Facilities\Support\TodayStatus;
use App\Domain\Identity\Enums\Permission;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * GET / PUT /admin/facilities/{facility}/today: "Today at this facility". Anyone who can
 * edit the facility updates it (it is short-lived, so no second approval); it is audited.
 */
final class FacilityTodayController extends Controller
{
    public function show(Request $request, Facility $facility): JsonResponse
    {
        abort_unless($request->user()->isActive() && $request->user()->canAt(Permission::FacilitiesView, $facility), 403);

        return response()->json(['data' => TodayStatus::present(TodayStatus::find($facility), forStaff: true)]);
    }

    public function update(Request $request, Facility $facility): JsonResponse
    {
        abort_unless($request->user()->isActive() && $request->user()->canAt(Permission::FacilitiesEdit, $facility), 403);

        $input = $request->validate([
            'doctor' => ['present', 'nullable', Rule::in(FacilityDayStatus::DOCTOR)],
            'opening' => ['present', 'nullable', Rule::in(FacilityDayStatus::OPENING)],
            'closes_at' => ['nullable', 'required_if:opening,closing_early', 'date_format:H:i'],
            'out_of_stock' => ['present', 'array', 'max:12'],
            'out_of_stock.*' => ['string', 'min:2', 'max:60', 'distinct'],
            'note' => ['present', 'nullable', 'string', 'max:160'],
        ], ['closes_at.required_if' => 'Give the time you close today.']);

        $values = [
            'doctor' => $input['doctor'],
            'opening' => $input['opening'],
            'closes_at' => $input['opening'] === 'closing_early' ? $input['closes_at'] : null,
            'out_of_stock' => array_values(array_map('trim', $input['out_of_stock'])),
            'note' => isset($input['note']) && trim($input['note']) !== '' ? trim($input['note']) : null,
            'updated_by' => $request->user()->id,
        ];

        $status = FacilityDayStatus::query()->updateOrCreate(['facility_id' => $facility->id, 'status_date' => FacilitySnapshot::today()], $values);
        FacilityTodayUpdated::dispatch($facility->public_id, $request->user()->id, array_diff_key($values, ['updated_by' => true]));

        return response()->json(['data' => TodayStatus::present($status->load('editor'), forStaff: true)]);
    }
}
