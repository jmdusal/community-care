<?php

namespace App\Domain\Analytics\Queries;

use App\Domain\Analytics\Models\UsageEvent;
use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Facilities\Models\Facility;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\LazyCollection;

/**
 * Pilot reports for a date range (Philippine days): appointments by status, source and day,
 * the busiest facilities, and directory use (searches, profile views, call and directions
 * taps). Aggregates only, never names or contact details.
 *
 * $facilityIds limits everything to those facilities (null = all). Searches are not tied to a
 * facility, so they are counted only for all facilities or a region.
 */
final class ReportsQuery
{
    /** Asia/Manila has no daylight saving time, so a fixed offset gives the local day. */
    private const LOCAL_DAY = 'DATE(DATE_ADD(%s, INTERVAL 8 HOUR))';

    /**
     * @param  list<int>|null  $facilityIds
     * @return array<string, mixed>
     */
    public function handle(CarbonImmutable $from, CarbonImmutable $to, ?array $facilityIds, ?int $regionId): array
    {
        [$start, $end] = $this->bounds($from, $to);

        $appointments = fn (): Builder => Appointment::query()
            ->whereBetween('starts_at', [$start, $end])
            ->when($facilityIds !== null, fn (Builder $q) => $q->whereIn('facility_id', $facilityIds))
            ->when($regionId !== null, fn (Builder $q) => $q->whereHas('facility', fn (Builder $f) => $f->where('region_id', $regionId)));

        $byStatus = $appointments()->select('status', DB::raw('COUNT(*) as total'))->groupBy('status')->pluck('total', 'status')->map(fn ($n) => (int) $n);
        $bySource = $appointments()->select('source', DB::raw('COUNT(*) as total'))->groupBy('source')->pluck('total', 'source')->map(fn ($n) => (int) $n);
        $completed = $byStatus->get(AppointmentStatus::Completed->value, 0);
        $missed = $byStatus->get(AppointmentStatus::NoShow->value, 0);

        $perDay = $appointments()
            ->select(DB::raw(sprintf(self::LOCAL_DAY, 'starts_at').' as day'), DB::raw('COUNT(*) as total'))
            ->groupBy('day')->pluck('total', 'day');

        $topFacilities = $appointments()
            ->select('facility_id', DB::raw('COUNT(*) as total'),
                DB::raw("SUM(status = 'completed') as completed"),
                DB::raw("SUM(status = 'no_show') as no_show"),
                DB::raw("SUM(status IN ('declined','cancelled')) as not_held"))
            ->groupBy('facility_id')->orderByDesc('total')->limit(10)
            ->with('facility:id,public_id,name')
            ->get()
            ->map(fn (Appointment $row): array => [
                'id' => $row->facility?->public_id,
                'name' => $row->facility?->name,
                'appointments' => (int) $row->total,
                'completed' => (int) $row->completed,
                'no_show' => (int) $row->no_show,
                'not_held' => (int) $row->not_held,
            ]);

        $usage = $this->usage($start, $end, $facilityIds, $regionId);

        return [
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString(), 'days' => $from->diffInDays($to) + 1],
            'appointments' => [
                'total' => $byStatus->sum(),
                'by_status' => collect(AppointmentStatus::cases())->mapWithKeys(fn (AppointmentStatus $s) => [$s->value => $byStatus->get($s->value, 0)]),
                'by_source' => collect([Appointment::SOURCE_ONLINE, Appointment::SOURCE_GUEST, Appointment::SOURCE_STAFF])->mapWithKeys(fn (string $s) => [$s => $bySource->get($s, 0)]),
                // Of the visits whose outcome was recorded, how many happened.
                'attendance_rate' => $completed + $missed === 0 ? null : round($completed / ($completed + $missed), 3),
                'top_facilities' => $topFacilities,
            ],
            'usage' => [
                'totals' => $usage['totals'],
                'searches_counted' => $facilityIds === null,
            ],
            'by_day' => $this->days($from, $to)->map(fn (string $day): array => [
                'date' => $day,
                'appointments' => (int) ($perDay[$day] ?? 0),
                ...collect($usage['per_day'])->map(fn ($counts) => (int) ($counts[$day] ?? 0))->all(),
            ])->values(),
        ];
    }

    /**
     * One row per facility in scope, for the CSV export.
     *
     * @param  list<int>|null  $facilityIds
     * @return LazyCollection<int, array<string, mixed>>
     */
    public function facilityRows(CarbonImmutable $from, CarbonImmutable $to, ?array $facilityIds, ?int $regionId): LazyCollection
    {
        [$start, $end] = $this->bounds($from, $to);
        $usage = fn (string $event) => UsageEvent::query()->select(DB::raw('COUNT(*)'))->whereColumn('usage_events.facility_id', 'facilities.id')->where('event', $event)->whereBetween('created_at', [$start, $end]);
        $appointments = fn (?string $status = null) => Appointment::query()->select(DB::raw('COUNT(*)'))->whereColumn('appointments.facility_id', 'facilities.id')->whereBetween('starts_at', [$start, $end])->when($status, fn (Builder $q, string $s) => $q->where('status', $s));

        return Facility::query()
            ->with(['type:id,name', 'region:id,name', 'cityMunicipality:id,name'])
            ->withCount('services')
            ->when($facilityIds !== null, fn (Builder $q) => $q->whereIn('id', $facilityIds))
            ->when($regionId !== null, fn (Builder $q) => $q->where('region_id', $regionId))
            ->addSelect([
                'profile_views' => $usage(UsageEvent::PROFILE_VIEW),
                'call_clicks' => $usage(UsageEvent::CALL_CLICK),
                'directions_clicks' => $usage(UsageEvent::DIRECTIONS_CLICK),
                'appointments_total' => $appointments(),
                'appointments_completed' => $appointments(AppointmentStatus::Completed->value),
                'appointments_no_show' => $appointments(AppointmentStatus::NoShow->value),
            ])
            ->orderBy('name')
            ->lazy(500)
            ->map(fn (Facility $f): array => [
                'facility_id' => $f->public_id,
                'name' => $f->name,
                'type' => $f->type?->name,
                'city_municipality' => $f->cityMunicipality?->name,
                'region' => $f->region?->name,
                'publication_status' => $f->publication_status->value,
                'verification_status' => $f->verification_status->value,
                'verified_at' => $f->verified_at?->toDateString(),
                'services' => $f->services_count,
                'booking_enabled' => $f->booking_enabled ? 'yes' : 'no',
                'profile_views' => (int) $f->profile_views,
                'call_clicks' => (int) $f->call_clicks,
                'directions_clicks' => (int) $f->directions_clicks,
                'appointments' => (int) $f->appointments_total,
                'completed' => (int) $f->appointments_completed,
                'no_show' => (int) $f->appointments_no_show,
            ]);
    }

    /**
     * Appointment rows for the CSV export: no names or contact details.
     *
     * @param  list<int>|null  $facilityIds
     * @return LazyCollection<int, array<string, mixed>>
     */
    public function appointmentRows(CarbonImmutable $from, CarbonImmutable $to, ?array $facilityIds, ?int $regionId): LazyCollection
    {
        [$start, $end] = $this->bounds($from, $to);
        $tz = (string) config('communitycare.display_timezone');

        return Appointment::query()
            ->with(['facility:id,public_id,name', 'service:id,name'])
            ->whereBetween('starts_at', [$start, $end])
            ->when($facilityIds !== null, fn (Builder $q) => $q->whereIn('facility_id', $facilityIds))
            ->when($regionId !== null, fn (Builder $q) => $q->whereHas('facility', fn (Builder $f) => $f->where('region_id', $regionId)))
            ->orderBy('starts_at')
            ->lazy(500)
            ->map(fn (Appointment $a): array => [
                'reference_code' => $a->reference_code,
                'facility_id' => $a->facility?->public_id,
                'facility' => $a->facility?->name,
                'service' => $a->service?->name ?? 'General',
                'starts_at' => $a->starts_at->timezone($tz)->format('Y-m-d H:i'),
                'status' => $a->status->value,
                'source' => $a->source,
                'requested_at' => $a->created_at?->timezone($tz)->format('Y-m-d H:i'),
            ]);
    }

    /**
     * @param  list<int>|null  $facilityIds
     * @return array{totals: array<string, int|null>, per_day: array<string, Collection<string, int>>}
     */
    private function usage(string $start, string $end, ?array $facilityIds, ?int $regionId): array
    {
        $events = [UsageEvent::SEARCH, UsageEvent::PROFILE_VIEW, UsageEvent::CALL_CLICK, UsageEvent::DIRECTIONS_CLICK];
        $rows = UsageEvent::query()
            ->select('event', DB::raw(sprintf(self::LOCAL_DAY, 'created_at').' as day'), DB::raw('COUNT(*) as total'))
            ->whereIn('event', $events)
            ->whereBetween('created_at', [$start, $end])
            ->when($facilityIds !== null, fn (Builder $q) => $q->whereIn('facility_id', $facilityIds))
            ->when($regionId !== null, fn (Builder $q) => $q->where(fn (Builder $w) => $w
                ->where('region_id', $regionId)
                ->orWhereIn('facility_id', Facility::query()->select('id')->where('region_id', $regionId))))
            ->groupBy('event', 'day')
            ->get();

        $perDay = [];
        $totals = [];
        foreach ($events as $event) {
            $mine = $rows->where('event', $event);
            $perDay[$event] = $mine->pluck('total', 'day');
            $totals[$event] = $event === UsageEvent::SEARCH && $facilityIds !== null ? null : (int) $mine->sum('total');
        }

        return ['totals' => $totals, 'per_day' => $perDay];
    }

    /** @return array{0: string, 1: string} UTC bounds of the Philippine days */
    private function bounds(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $tz = (string) config('communitycare.display_timezone');

        return [
            $from->setTimezone($tz)->startOfDay()->utc()->toDateTimeString(),
            $to->setTimezone($tz)->endOfDay()->utc()->toDateTimeString(),
        ];
    }

    /** @return Collection<int, string> */
    private function days(CarbonImmutable $from, CarbonImmutable $to): Collection
    {
        $days = collect();
        for ($day = $from; $day->lte($to); $day = $day->addDay()) {
            $days->push($day->toDateString());
        }

        return $days;
    }
}
