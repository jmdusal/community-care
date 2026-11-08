<?php

namespace App\Domain\Facilities\Queries;

use App\Domain\DataImports\Matching\NameNormalizer;
use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Geography\Models\AreaGeometry;
use App\Domain\Settings\Contracts\SettingsRepository;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Data-quality review: what is missing or doubtful on each facility record, so it can be
 * fixed before people rely on it. Works on any scope (all, one region, one facility).
 */
final class DataQualityQuery
{
    /** Issue key => [label, why it matters] */
    public const ISSUES = [
        'missing_coordinates' => ['No map position', 'Not found by "near me" and missing from maps.'],
        'outside_area' => ['Position outside its city', 'The map pin is probably wrong.'],
        'no_contact' => ['No public phone or email', 'People cannot call ahead.'],
        'no_hours' => ['No opening hours', 'People may arrive when it is closed.'],
        'no_services' => ['No listed services', 'Service filters and the assistant cannot find it.'],
        'stale' => ['Verification is stale', 'Details may be out of date. Re-verify.'],
        'not_verified' => ['Published but not verified', 'Shown publicly before review.'],
        'possible_duplicate' => ['Possible duplicate', 'Another facility in the same city has a very similar name.'],
    ];

    public function __construct(private readonly SettingsRepository $settings) {}

    /**
     * @param  callable(Builder<Facility>): void  $scope  narrows the facilities (top-bar scope, staff assignments)
     * @return array{summary: array<string, array{label: string, why: string, count: int}>, facilities: list<array<string, mixed>>, total: int, complete: int}
     */
    public function handle(callable $scope): array
    {
        $facilities = Facility::query()
            ->tap($scope)
            ->with(['cityMunicipality:id,psgc_code,name', 'region:id,name'])
            ->withCount([
                'contacts as public_contacts_count' => fn (Builder $q) => $q->where('is_public', true),
                'hours',
                'services',
            ])
            ->orderBy('name')
            ->get();

        $bounds = AreaGeometry::query()
            ->where('status', AreaGeometry::FOUND)
            ->whereIn('psgc_code', $facilities->pluck('cityMunicipality.psgc_code')->filter()->unique())
            ->pluck('bbox', 'psgc_code');

        $duplicates = $this->duplicateIds($facilities);

        $rows = $facilities->map(function (Facility $facility) use ($bounds, $duplicates): array {
            $issues = [];
            $hasPosition = $facility->latitude !== null && $facility->longitude !== null;

            if (! $hasPosition) {
                $issues[] = 'missing_coordinates';
            } elseif (($bbox = $bounds[$facility->cityMunicipality?->psgc_code] ?? null) && ! $this->inside((float) $facility->latitude, (float) $facility->longitude, $bbox)) {
                $issues[] = 'outside_area';
            }
            if ($facility->public_contacts_count === 0) {
                $issues[] = 'no_contact';
            }
            if ($facility->hours_count === 0) {
                $issues[] = 'no_hours';
            }
            if ($facility->services_count === 0) {
                $issues[] = 'no_services';
            }
            if ($facility->verification_status === VerificationStatus::Stale) {
                $issues[] = 'stale';
            }
            if ($facility->publication_status === PublicationStatus::Published && ! in_array($facility->verification_status, [VerificationStatus::Verified, VerificationStatus::Stale], true)) {
                $issues[] = 'not_verified';
            }
            if (isset($duplicates[$facility->id])) {
                $issues[] = 'possible_duplicate';
            }

            return [
                'id' => $facility->public_id,
                'name' => $facility->name,
                'city' => $facility->cityMunicipality?->name,
                'region' => $facility->region?->name,
                'published' => $facility->publication_status === PublicationStatus::Published,
                'issues' => $issues,
                'duplicate_of' => $duplicates[$facility->id] ?? null,
            ];
        });

        $summary = [];
        foreach (self::ISSUES as $key => [$label, $why]) {
            $summary[$key] = ['label' => $label, 'why' => $why, 'count' => $rows->filter(fn (array $row): bool => in_array($key, $row['issues'], true))->count()];
        }

        return [
            'summary' => $summary,
            'facilities' => $rows->filter(fn (array $row): bool => $row['issues'] !== [])->sortByDesc(fn (array $row): int => count($row['issues']))->values()->all(),
            'total' => $rows->count(),
            'complete' => $rows->filter(fn (array $row): bool => $row['issues'] === [])->count(),
        ];
    }

    /**
     * Facilities in the same city whose normalised names are at least as similar as the
     * import duplicate threshold. @return array<int, array{id: string, name: string}> facility id => the other one
     */
    private function duplicateIds(Collection $facilities): array
    {
        $threshold = $this->settings->int('imports.duplicate_name_similarity');
        $found = [];

        foreach ($facilities->groupBy('city_municipality_id') as $cityId => $group) {
            if ($cityId === '' || $group->count() < 2) {
                continue;
            }
            $names = $group->mapWithKeys(fn (Facility $facility): array => [$facility->id => NameNormalizer::normalize($facility->name)]);
            $list = $group->values();

            for ($i = 0; $i < $list->count(); $i++) {
                for ($j = $i + 1; $j < $list->count(); $j++) {
                    [$a, $b] = [$list[$i], $list[$j]];
                    if (NameNormalizer::similarity($names[$a->id], $names[$b->id]) >= $threshold) {
                        $found[$a->id] ??= ['id' => $b->public_id, 'name' => $b->name];
                        $found[$b->id] ??= ['id' => $a->public_id, 'name' => $a->name];
                    }
                }
            }
        }

        return $found;
    }

    /** @param array{0: float, 1: float, 2: float, 3: float} $bbox south, west, north, east (with a small margin) */
    private function inside(float $lat, float $lng, array $bbox): bool
    {
        [$south, $west, $north, $east] = $bbox;
        $margin = 0.01; // about 1 km

        return $lat >= $south - $margin && $lat <= $north + $margin && $lng >= $west - $margin && $lng <= $east + $margin;
    }
}
