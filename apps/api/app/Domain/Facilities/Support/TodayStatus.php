<?php

namespace App\Domain\Facilities\Support;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityDayStatus;
use App\Http\Support\Time;

/** Today's (Philippine date) status for a facility, in the shape the API returns. */
final class TodayStatus
{
    public static function find(Facility $facility): ?FacilityDayStatus
    {
        return FacilityDayStatus::query()->where('facility_id', $facility->id)->whereDate('status_date', FacilitySnapshot::today())->first();
    }

    /** @return array<string, mixed>|null null when nothing was posted today */
    public static function present(?FacilityDayStatus $status, bool $forStaff = false): ?array
    {
        if ($status === null) {
            return null;
        }

        return [
            'date' => $status->status_date->toDateString(),
            'doctor' => $status->doctor,
            'opening' => $status->opening,
            'closes_at' => $status->closes_at === null ? null : substr((string) $status->closes_at, 0, 5),
            'out_of_stock' => array_values($status->out_of_stock ?? []),
            'note' => $status->note,
            'updated_at' => Time::iso($status->updated_at),
            'updated_by' => $forStaff ? $status->editor?->name : null,
        ];
    }
}
