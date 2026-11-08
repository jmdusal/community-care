<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Booking\Support\BookingRules;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Settings\Contracts\SettingsRepository;
use App\Http\Controllers\Controller;
use App\Http\Resources\AvailabilityResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** GET /facilities/{id}/availability: open future slots with seats left (next 14 days by default). */
final class AvailabilityController extends Controller
{
    private const MAX_DAYS = 31;

    public function __invoke(Request $request, Facility $facility, SettingsRepository $settings, BookingRules $rules): JsonResponse
    {
        abort_unless($facility->publication_status->value === 'published', 404);

        $input = $request->validate(['days' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_DAYS], 'service' => ['nullable', 'string', 'exists:services,slug']]);
        $enabled = $settings->bool('features.booking.enabled') && $facility->booking_enabled;

        $slots = ! $enabled ? collect() : ClinicAvailability::query()
            ->with('service:id,slug,name')
            ->where('facility_id', $facility->id)
            ->where('status', ClinicAvailability::OPEN)
            ->whereColumn('booked_count', '<', 'capacity')
            // The facility's notice period, and never on its closed special days.
            ->whereBetween('starts_at', [$rules->earliestStart($facility)->max(now()->addMinutes(30)), now()->addDays((int) ($input['days'] ?? 14))])
            ->when($input['service'] ?? null, fn ($q, string $slug) => $q->whereHas('service', fn ($s) => $s->where('slug', $slug)))
            ->orderBy('starts_at')
            ->limit(300)
            ->get();
        $closed = $enabled ? $rules->closedDates($facility) : [];
        $tz = (string) config('communitycare.display_timezone');
        $slots = $slots->reject(fn (ClinicAvailability $slot) => in_array($slot->starts_at->copy()->timezone($tz)->toDateString(), $closed, true))->values();

        return response()->json([
            'data' => AvailabilityResource::collection($slots)->resolve($request),
            'meta' => ['booking_enabled' => $enabled],
        ]);
    }
}
