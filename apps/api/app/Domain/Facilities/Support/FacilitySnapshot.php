<?php

namespace App\Domain\Facilities\Support;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityContact;
use App\Domain\Facilities\Models\FacilityHour;
use App\Domain\Facilities\Models\FacilityHourException;

/**
 * The editable fields of a facility in one comparable shape. Change requests
 * store before/after values in this shape, and approval re-checks "before"
 * against a fresh snapshot to catch edits made in the meantime.
 */
final class FacilitySnapshot
{
    public const FIELDS = ['name', 'type', 'address', 'city_code', 'barangay_code', 'latitude', 'longitude', 'contacts', 'hours', 'hour_exceptions', 'services'];

    /** @return array<string, mixed> */
    public static function of(Facility $facility): array
    {
        $facility->loadMissing(['type', 'cityMunicipality', 'barangay', 'contacts', 'hours', 'services']);
        // Special days from today on; past ones stay in the database as history.
        $exceptions = $facility->hourExceptions()->whereDate('date', '>=', self::today())->orderBy('date')->get();

        return self::normalize([
            'name' => $facility->name,
            'type' => $facility->type?->slug,
            'address' => $facility->address,
            'city_code' => $facility->cityMunicipality?->psgc_code,
            'barangay_code' => $facility->barangay?->psgc_code,
            'latitude' => $facility->latitude,
            'longitude' => $facility->longitude,
            'contacts' => $facility->contacts->map(fn (FacilityContact $contact): array => ['type' => $contact->contact_type, 'value' => $contact->value])->all(),
            'hours' => $facility->hours->map(fn (FacilityHour $hour): array => ['day_of_week' => $hour->day_of_week, 'opens_at' => substr((string) $hour->opens_at, 0, 5), 'closes_at' => substr((string) $hour->closes_at, 0, 5)])->all(),
            'hour_exceptions' => $exceptions->map(fn (FacilityHourException $day): array => [
                'date' => $day->date->toDateString(),
                'is_closed' => $day->is_closed,
                'opens_at' => $day->opens_at,
                'closes_at' => $day->closes_at,
                'reason' => $day->reason,
            ])->all(),
            'services' => $facility->services->pluck('slug')->all(),
        ]);
    }

    /**
     * Canonical form so equal data compares equal: trimmed strings, rounded
     * coordinates, lists sorted.
     *
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    public static function normalize(array $values): array
    {
        $normalized = [];

        foreach ($values as $field => $value) {
            $normalized[$field] = match ($field) {
                'latitude', 'longitude' => $value === null || $value === '' ? null : round((float) $value, 6),
                'contacts' => self::sorted(array_map(fn (array $c): array => ['type' => (string) $c['type'], 'value' => trim((string) $c['value'])], $value ?? [])),
                'hours' => self::sorted(array_map(fn (array $h): array => ['day_of_week' => (int) $h['day_of_week'], 'opens_at' => substr((string) $h['opens_at'], 0, 5), 'closes_at' => substr((string) $h['closes_at'], 0, 5)], $value ?? [])),
                'hour_exceptions' => self::sorted(array_map(function (array $day): array {
                    $closed = filter_var($day['is_closed'] ?? false, FILTER_VALIDATE_BOOLEAN);
                    $reason = trim((string) ($day['reason'] ?? ''));

                    return [
                        'date' => substr((string) $day['date'], 0, 10),
                        'is_closed' => $closed,
                        'opens_at' => $closed || empty($day['opens_at']) ? null : substr((string) $day['opens_at'], 0, 5),
                        'closes_at' => $closed || empty($day['closes_at']) ? null : substr((string) $day['closes_at'], 0, 5),
                        'reason' => $reason === '' ? null : $reason,
                    ];
                }, $value ?? [])),
                'services' => self::sorted(array_values(array_unique(array_map('strval', $value ?? [])))),
                default => is_string($value) ? (trim($value) === '' ? null : trim($value)) : $value,
            };
        }

        return $normalized;
    }

    /**
     * Fields in $proposed that differ from $current, as field => {before, after}.
     *
     * @param  array<string, mixed>  $current
     * @param  array<string, mixed>  $proposed
     * @return array<string, array{before: mixed, after: mixed}>
     */
    public static function diff(array $current, array $proposed): array
    {
        $proposed = self::normalize($proposed);
        $changes = [];

        foreach ($proposed as $field => $after) {
            $before = $current[$field] ?? null;
            if ($before !== $after) {
                $changes[$field] = ['before' => $before, 'after' => $after];
            }
        }

        return $changes;
    }

    /**
     * @param  list<mixed>  $list
     * @return list<mixed>
     */
    private static function sorted(array $list): array
    {
        usort($list, fn ($a, $b): int => strcmp((string) json_encode($a), (string) json_encode($b)));

        return array_values($list);
    }

    /** Today in Philippine time. */
    public static function today(): string
    {
        return now((string) config('communitycare.display_timezone'))->toDateString();
    }
}
