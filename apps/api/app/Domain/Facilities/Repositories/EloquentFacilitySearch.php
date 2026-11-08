<?php

namespace App\Domain\Facilities\Repositories;

use App\Domain\Facilities\Contracts\FacilityReader;
use App\Domain\Facilities\Data\FacilitySearchData;
use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Models\Facility;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/**
 * Public directory search on MySQL:
 * - text: InnoDB FULLTEXT in boolean mode (prefix match per word), with a LIKE
 *   fallback for words shorter than the full-text minimum token size;
 * - nearby: bounding box on the spatial index, then ST_Distance_Sphere.
 */
final class EloquentFacilitySearch implements FacilityReader
{
    private const FULLTEXT_MIN_WORD = 3;

    /** Relations every list item needs; loaded up front to avoid N+1 queries. */
    private const LIST_RELATIONS = ['type:id,slug,name', 'region:id,psgc_code,name', 'province:id,psgc_code,name', 'cityMunicipality:id,psgc_code,name', 'barangay:id,psgc_code,name', 'services:id,slug,name,category', 'sources'];

    public function search(FacilitySearchData $search): LengthAwarePaginator
    {
        $query = Facility::query()
            ->select('facilities.*')
            ->where('facilities.publication_status', PublicationStatus::Published)
            ->with(self::LIST_RELATIONS);

        $this->applyText($query, $search->query);
        $this->applyFilters($query, $search);

        if ($search->isNearby()) {
            $this->applyNearby($query, $search);
        } elseif ($search->query === null || trim($search->query) === '') {
            $query->orderBy('facilities.name');
        }

        $query->orderBy('facilities.id');

        return $query->paginate(perPage: $search->perPage, page: $search->page);
    }

    public function findPublished(string $publicId): ?Facility
    {
        return Facility::query()
            ->where('public_id', $publicId)
            ->where('publication_status', PublicationStatus::Published)
            ->with([
                ...self::LIST_RELATIONS,
                'contacts' => fn ($q) => $q->where('is_public', true),
                'hours',
                'hourExceptions' => fn ($q) => $q->whereDate('date', '>=', now()->toDateString())->orderBy('date')->limit(10),
            ])
            ->first();
    }

    /** @param Builder<Facility> $query */
    private function applyText(Builder $query, ?string $text): void
    {
        $words = preg_split('/\s+/u', trim((string) preg_replace('/[+\-<>()~*"@]+/u', ' ', (string) $text))) ?: [];
        $words = array_values(array_filter($words, fn (string $word): bool => $word !== ''));

        if ($words === []) {
            return;
        }

        $long = array_filter($words, fn (string $word): bool => mb_strlen($word) >= self::FULLTEXT_MIN_WORD);
        $short = array_diff($words, $long);

        if ($long !== []) {
            $boolean = implode(' ', array_map(fn (string $word): string => '+'.$word.'*', $long));
            $query->whereFullText(['facilities.name', 'facilities.address'], $boolean, ['mode' => 'boolean'])
                ->orderByRaw('MATCH(facilities.name, facilities.address) AGAINST (? IN BOOLEAN MODE) DESC', [$boolean]);
        }

        foreach ($short as $word) {
            $like = '%'.addcslashes($word, '%_\\').'%';
            $query->where(fn (Builder $q) => $q->where('facilities.name', 'like', $like)->orWhere('facilities.address', 'like', $like));
        }
    }

    /** @param Builder<Facility> $query */
    private function applyFilters(Builder $query, FacilitySearchData $search): void
    {
        $byCode = [
            'region' => $search->regionCode,
            'province' => $search->provinceCode,
            'cityMunicipality' => $search->cityCode,
            'barangay' => $search->barangayCode,
        ];

        foreach ($byCode as $relation => $code) {
            if ($code !== null) {
                $query->whereHas($relation, fn (Builder $q) => $q->where('psgc_code', $code));
            }
        }

        if ($search->type !== null) {
            $query->whereHas('type', fn (Builder $q) => $q->where('slug', $search->type));
        }

        if ($search->service !== null) {
            $query->whereHas('services', fn (Builder $q) => $q->where('slug', $search->service));
        }

        if ($search->verifiedOnly) {
            $query->where('facilities.verification_status', VerificationStatus::Verified);
        }
    }

    /** @param Builder<Facility> $query */
    private function applyNearby(Builder $query, FacilitySearchData $search): void
    {
        $lat = (float) $search->latitude;
        $lng = (float) $search->longitude;
        $dLat = $search->radiusKm / 111.32;
        $dLng = $search->radiusKm / (111.32 * max(0.01, cos(deg2rad($lat))));

        $point = sprintf('POINT(%.6F %.6F)', $lng, $lat);
        $box = sprintf(
            'POLYGON((%1$.6F %3$.6F, %2$.6F %3$.6F, %2$.6F %4$.6F, %1$.6F %4$.6F, %1$.6F %3$.6F))',
            $lng - $dLng, $lng + $dLng, $lat - $dLat, $lat + $dLat,
        );

        $query->join('facility_locations', 'facility_locations.facility_id', '=', 'facilities.id')
            ->whereRaw("MBRContains(ST_GeomFromText(?, 4326, 'axis-order=long-lat'), facility_locations.location)", [$box])
            ->selectRaw("ST_Distance_Sphere(facility_locations.location, ST_GeomFromText(?, 4326, 'axis-order=long-lat')) / 1000 AS distance_km", [$point])
            ->havingRaw('distance_km <= ?', [$search->radiusKm])
            ->orderBy('distance_km');
    }
}
