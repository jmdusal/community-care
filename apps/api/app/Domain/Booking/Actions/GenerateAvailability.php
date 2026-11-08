<?php

namespace App\Domain\Booking\Actions;

use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Creates time slots for a facility: on the chosen weekdays between two dates,
 * from a start to an end time, split into slots of N minutes, each with a seat
 * limit. Times are entered in Philippine time. Existing slots are skipped.
 */
final class GenerateAvailability
{
    public const MAX_SLOTS = 600;

    /**
     * @param  list<int>  $weekdays  0 = Sunday … 6 = Saturday
     * @return int slots created
     */
    public function handle(Facility $facility, ?int $serviceId, string $fromDate, string $toDate, array $weekdays, string $startTime, string $endTime, int $slotMinutes, int $capacity, User $actor): int
    {
        $tz = (string) config('communitycare.display_timezone');
        $day = CarbonImmutable::parse($fromDate, $tz)->startOfDay();
        $last = CarbonImmutable::parse($toDate, $tz)->startOfDay();
        $now = now();
        $rows = [];

        while ($day->lte($last)) {
            if (in_array($day->dayOfWeek, $weekdays, true)) {
                $start = CarbonImmutable::parse($day->toDateString().' '.$startTime, $tz);
                $end = CarbonImmutable::parse($day->toDateString().' '.$endTime, $tz);

                for ($slot = $start; $slot->addMinutes($slotMinutes)->lte($end); $slot = $slot->addMinutes($slotMinutes)) {
                    if ($slot->lte($now)) {
                        continue;
                    }
                    $rows[] = [
                        'public_id' => (string) str()->ulid(),
                        'facility_id' => $facility->id,
                        'service_id' => $serviceId,
                        'starts_at' => $slot->utc(),
                        'ends_at' => $slot->addMinutes($slotMinutes)->utc(),
                        'capacity' => $capacity,
                        'booked_count' => 0,
                        'status' => ClinicAvailability::OPEN,
                        'created_by' => $actor->id,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];

                    if (count($rows) > self::MAX_SLOTS) {
                        throw new InvalidArgumentException('Too many slots at once (over '.self::MAX_SLOTS.'). Choose a shorter date range or longer slots.');
                    }
                }
            }
            $day = $day->addDay();
        }

        return DB::transaction(fn (): int => array_sum(array_map(
            fn (array $chunk): int => ClinicAvailability::query()->insertOrIgnore($chunk),
            array_chunk($rows, 200),
        )));
    }
}
