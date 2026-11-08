<?php

namespace App\Domain\DataImports\Matching;

use App\Domain\DataImports\Data\FacilityRecordData;
use App\Domain\DataImports\Data\MatchResult;
use App\Domain\DataImports\Enums\ImportFlag;
use App\Domain\DataImports\Enums\MatchStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilitySource;
use App\Domain\Geography\Support\Distance;
use App\Domain\Geography\Support\GeographyLookup;

/**
 * Normalizes, matches and flags one record at a time against what is already
 * published. Built once per batch: it preloads source ids and facility names so
 * matching does not query the database per row.
 *
 * Matching rule (technical documentation, section 11): source identifiers first;
 * names and addresses only ever PROPOSE duplicates, they never merge records.
 */
final class FacilityMatcher
{
    /** @var array<string, array{facility_id: int, hash: string|null}> */
    private array $sources;

    /** @var array<int, array{lat: float|null, lng: float|null}> */
    private array $coordinates = [];

    /** @var array<int, list<array{id: int, name: string}>> facilities grouped by city id */
    private array $namesByCity = [];

    /** @var array<string, int> source ids already seen in this file => row number */
    private array $seen = [];

    public function __construct(
        private readonly string $sourceName,
        private readonly GeographyLookup $geography,
        private readonly float $coordinateConflictKm,
        private readonly int $duplicateSimilarity,
    ) {
        $this->sources = FacilitySource::query()
            ->where('source_name', $sourceName)
            ->get(['source_record_id', 'facility_id', 'payload_hash'])
            ->mapWithKeys(fn (FacilitySource $source): array => [
                $source->source_record_id => ['facility_id' => $source->facility_id, 'hash' => $source->payload_hash],
            ])
            ->all();

        Facility::query()
            ->select(['id', 'name', 'city_municipality_id', 'latitude', 'longitude'])
            ->lazyById(2000)
            ->each(function (Facility $facility): void {
                $this->coordinates[$facility->id] = ['lat' => $facility->latitude, 'lng' => $facility->longitude];
                if ($facility->city_municipality_id !== null) {
                    $this->namesByCity[$facility->city_municipality_id][] = ['id' => $facility->id, 'name' => NameNormalizer::normalize($facility->name)];
                }
            });
    }

    public function evaluate(FacilityRecordData $record): MatchResult
    {
        $flags = [];
        $flag = function (ImportFlag $code, ?string $detail = null) use (&$flags): void {
            $flags[] = ['code' => $code->value, 'label' => $code->label(), 'detail' => $detail];
        };

        if ($record->name === null) {
            $flag(ImportFlag::MissingName);

            return new MatchResult($record, MatchStatus::Invalid, null, $flags, []);
        }

        $record = $this->validateLocation($record, $flag);

        if ($record->sourceRecordId === null) {
            $flag(ImportFlag::MissingIdentifier);
        } elseif (isset($this->seen[$record->sourceRecordId])) {
            $flag(ImportFlag::DuplicateCandidate, "Same source ID as row {$this->seen[$record->sourceRecordId]} of this file.");
        } else {
            $this->seen[$record->sourceRecordId] = $record->rowNumber;
        }

        $existing = $record->sourceRecordId !== null ? ($this->sources[$record->sourceRecordId] ?? null) : null;

        if ($existing !== null) {
            $status = $existing['hash'] === $record->hash() ? MatchStatus::Unchanged : MatchStatus::Updated;
            $this->checkCoordinateConflict($record, $existing['facility_id'], $flag);

            return new MatchResult($record, $status, $existing['facility_id'], $flags, []);
        }

        $duplicates = $this->findDuplicates($record);
        if ($duplicates !== []) {
            $flag(ImportFlag::DuplicateCandidate, 'Similar name in the same city: '.count($duplicates).' existing record(s).');
        }

        return new MatchResult($record, MatchStatus::New, null, $flags, $duplicates);
    }

    /** @param callable(ImportFlag, string|null): void $flag */
    private function validateLocation(FacilityRecordData $record, callable $flag): FacilityRecordData
    {
        $data = $record->toArray();

        foreach (['region_code', 'province_code', 'city_code', 'barangay_code'] as $field) {
            if ($data[$field] !== null && strlen($data[$field]) !== 10) {
                $flag(ImportFlag::InvalidPsgc, "{$field} \"{$data[$field]}\" is not a 10-digit PSGC code.");
                $data[$field] = null;
            }
        }

        if ($data['city_code'] !== null && $this->geography->cityId($data['city_code']) === null) {
            $flag(ImportFlag::UnknownLocation, "City/municipality {$data['city_code']} is not in the location tables. Import the PSGC release first.");
        }

        if ($record->hasCoordinates() && ! Distance::isInPhilippines((float) $record->latitude, (float) $record->longitude)) {
            $flag(ImportFlag::CoordinatesOutOfBounds, "{$record->latitude}, {$record->longitude}");
            $data['latitude'] = null;
            $data['longitude'] = null;
        }

        return FacilityRecordData::fromArray($data);
    }

    /** @param callable(ImportFlag, string|null): void $flag */
    private function checkCoordinateConflict(FacilityRecordData $record, int $facilityId, callable $flag): void
    {
        $current = $this->coordinates[$facilityId] ?? null;

        if (! $record->hasCoordinates() || $current === null || $current['lat'] === null || $current['lng'] === null) {
            return;
        }

        $km = Distance::km($current['lat'], $current['lng'], (float) $record->latitude, (float) $record->longitude);

        if ($km > $this->coordinateConflictKm) {
            $flag(ImportFlag::CoordinateConflict, sprintf('Moved %.1f km from the published location.', $km));
        }
    }

    /** @return list<array{facility_id: int, score: int, reason: string}> */
    private function findDuplicates(FacilityRecordData $record): array
    {
        $cityId = $this->geography->cityId($record->cityCode);
        if ($cityId === null || ! isset($this->namesByCity[$cityId])) {
            return [];
        }

        $name = NameNormalizer::normalize((string) $record->name);
        $matches = [];

        foreach ($this->namesByCity[$cityId] as $candidate) {
            $lengthRatio = min(strlen($name), strlen($candidate['name'])) / max(1, max(strlen($name), strlen($candidate['name'])));
            if ($lengthRatio < 0.6) {
                continue;
            }

            $score = NameNormalizer::similarity($name, $candidate['name']);
            if ($score >= $this->duplicateSimilarity) {
                $matches[] = ['facility_id' => $candidate['id'], 'score' => $score, 'reason' => 'name_and_city'];
            }
        }

        usort($matches, fn (array $a, array $b): int => $b['score'] <=> $a['score']);

        return array_slice($matches, 0, 5);
    }
}
