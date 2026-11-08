<?php

namespace App\Domain\Booking\Support;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Support\FacilitySnapshot;
use App\Domain\Settings\Contracts\SettingsRepository;
use Carbon\CarbonInterface;

/**
 * A facility's booking rules: its own value when set, otherwise the system default
 * (Settings). Also knows the facility's closed special days, which block booking.
 */
final class BookingRules
{
    public function __construct(private readonly SettingsRepository $settings) {}

    /** Upcoming requested or confirmed appointments one person may hold at this facility's rules. */
    public function maxActive(Facility $facility): int
    {
        return $facility->booking_max_active ?? $this->settings->int('booking.max_active_per_patient');
    }

    public function cancelCutoffHours(Facility $facility): int
    {
        return $facility->booking_cancel_cutoff_hours ?? $this->settings->int('booking.cancel_cutoff_hours');
    }

    public function minNoticeHours(Facility $facility): int
    {
        return $facility->booking_min_notice_hours ?? $this->settings->int('booking.min_notice_hours');
    }

    /** The earliest start time that can still be requested. */
    public function earliestStart(Facility $facility): CarbonInterface
    {
        return now()->addHours($this->minNoticeHours($facility));
    }

    /**
     * Closed special days from today on, as "Y-m-d" (Philippine dates).
     *
     * @return list<string>
     */
    public function closedDates(Facility $facility): array
    {
        return $facility->hourExceptions()
            ->where('is_closed', true)
            ->whereDate('date', '>=', FacilitySnapshot::today())
            ->pluck('date')
            ->map(fn ($date) => substr((string) $date, 0, 10))
            ->all();
    }

    public function isClosedOn(Facility $facility, CarbonInterface $startsAt): bool
    {
        $day = $startsAt->copy()->timezone((string) config('communitycare.display_timezone'))->toDateString();

        return in_array($day, $this->closedDates($facility), true);
    }

    /** @return array{max_active: int|null, cancel_cutoff_hours: int|null, min_notice_hours: int|null, effective: array{max_active: int, cancel_cutoff_hours: int, min_notice_hours: int}, defaults: array{max_active: int, cancel_cutoff_hours: int, min_notice_hours: int}} */
    public function describe(Facility $facility): array
    {
        return [
            'max_active' => $facility->booking_max_active,
            'cancel_cutoff_hours' => $facility->booking_cancel_cutoff_hours,
            'min_notice_hours' => $facility->booking_min_notice_hours,
            'effective' => ['max_active' => $this->maxActive($facility), 'cancel_cutoff_hours' => $this->cancelCutoffHours($facility), 'min_notice_hours' => $this->minNoticeHours($facility)],
            'defaults' => [
                'max_active' => $this->settings->int('booking.max_active_per_patient'),
                'cancel_cutoff_hours' => $this->settings->int('booking.cancel_cutoff_hours'),
                'min_notice_hours' => $this->settings->int('booking.min_notice_hours'),
            ],
        ];
    }
}
