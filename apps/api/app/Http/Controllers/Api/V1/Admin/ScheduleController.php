<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Booking\Actions\CancelAvailability;
use App\Domain\Booking\Actions\GenerateAvailability;
use App\Domain\Booking\Events\BookingRulesChanged;
use App\Domain\Booking\Events\FacilityBookingChanged;
use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Booking\Support\BookingRules;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Services\Models\Service;
use App\Domain\Settings\Contracts\SettingsRepository;
use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\GenerateAvailabilityRequest;
use App\Http\Resources\AvailabilityResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

/** A facility's booking schedule: slots, generating new ones, and the pilot switch. */
final class ScheduleController extends Controller
{
    public function index(Request $request, Facility $facility, SettingsRepository $settings): JsonResponse
    {
        Gate::authorize('manage-schedule', $facility);

        $input = $request->validate(['from' => ['nullable', 'date'], 'days' => ['nullable', 'integer', 'min:1', 'max:62']]);
        $tz = (string) config('communitycare.display_timezone');
        $from = now()->parse($input['from'] ?? now($tz)->toDateString(), $tz)->startOfDay();

        $slots = ClinicAvailability::query()
            ->with('service:id,slug,name')
            ->where('facility_id', $facility->id)
            ->where('status', ClinicAvailability::OPEN)
            ->whereBetween('starts_at', [$from->copy()->utc(), $from->copy()->addDays((int) ($input['days'] ?? 14))->utc()])
            ->orderBy('starts_at')
            ->get();

        return response()->json([
            'data' => AvailabilityResource::collection($slots)->resolve($request),
            'meta' => [
                'facility' => ['id' => $facility->public_id, 'name' => $facility->name, 'booking_enabled' => $facility->booking_enabled, 'published' => $facility->publication_status->value === 'published'],
                'booking_feature_enabled' => $settings->bool('features.booking.enabled'),
                'can_enable_booking' => Gate::allows('enable-booking', $facility),
                'rules' => app(BookingRules::class)->describe($facility),
            ],
        ]);
    }

    public function store(GenerateAvailabilityRequest $request, Facility $facility, GenerateAvailability $generate): JsonResponse
    {
        Gate::authorize('manage-schedule', $facility);
        $input = $request->validated();

        try {
            $created = $generate->handle(
                $facility,
                isset($input['service']) ? Service::query()->where('slug', $input['service'])->value('id') : null,
                $input['from_date'],
                $input['to_date'],
                array_map('intval', $input['weekdays']),
                $input['start_time'],
                $input['end_time'],
                (int) $input['slot_minutes'],
                (int) $input['capacity'],
                $request->user(),
            );
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages(['to_date' => [$exception->getMessage()]]);
        }

        return response()->json(['data' => ['created' => $created]], 201);
    }

    public function destroy(ClinicAvailability $slot, CancelAvailability $cancel): JsonResponse
    {
        Gate::authorize('manage-schedule', $slot->facility);
        $cancel->handle($slot);

        return response()->json(null, 204);
    }

    /** Opt a facility in or out of the booking pilot (system admins). */
    public function booking(Request $request, Facility $facility): JsonResponse
    {
        Gate::authorize('enable-booking', $facility);
        $input = $request->validate(['enabled' => ['required', 'boolean']]);

        if ($facility->booking_enabled !== (bool) $input['enabled']) {
            $facility->forceFill(['booking_enabled' => (bool) $input['enabled']])->save();
            FacilityBookingChanged::dispatch($facility->public_id, $facility->booking_enabled, $request->user()->id);
        }

        return response()->json(['data' => ['booking_enabled' => $facility->booking_enabled]]);
    }

    /**
     * PATCH /admin/facilities/{facility}/booking-rules: this facility's own booking rules.
     * A null value means "use the system default". Same people who can turn booking on.
     */
    public function rules(Request $request, Facility $facility, BookingRules $rules): JsonResponse
    {
        Gate::authorize('enable-booking', $facility);

        $input = $request->validate([
            'max_active' => ['present', 'nullable', 'integer', 'min:1', 'max:10'],
            'cancel_cutoff_hours' => ['present', 'nullable', 'integer', 'min:0', 'max:72'],
            'min_notice_hours' => ['present', 'nullable', 'integer', 'min:0', 'max:168'],
        ]);

        $before = $rules->describe($facility);
        $facility->update([
            'booking_max_active' => $input['max_active'],
            'booking_cancel_cutoff_hours' => $input['cancel_cutoff_hours'],
            'booking_min_notice_hours' => $input['min_notice_hours'],
        ]);
        $after = $rules->describe($facility->refresh());

        BookingRulesChanged::dispatch($facility->public_id, $request->user()->id, array_intersect_key($before, array_flip(['max_active', 'cancel_cutoff_hours', 'min_notice_hours'])), array_intersect_key($after, array_flip(['max_active', 'cancel_cutoff_hours', 'min_notice_hours'])));

        return response()->json(['data' => $after]);
    }
}
