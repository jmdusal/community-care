<?php

namespace App\Domain\DataImports\Actions;

use App\Domain\DataImports\Data\GeoRecordData;
use App\Domain\DataImports\Enums\ImportBatchStatus;
use App\Domain\DataImports\Enums\ImportStep;
use App\Domain\DataImports\Events\ImportBatchPublished;
use App\Domain\DataImports\Exceptions\ImportFileInvalid;
use App\Domain\DataImports\Models\ImportBatch;
use App\Domain\DataImports\Support\AdapterRegistry;
use App\Domain\Geography\Models\Barangay;
use App\Domain\Geography\Models\CityMunicipality;
use App\Domain\Geography\Models\Province;
use App\Domain\Geography\Models\Region;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * PSGC reference data is validated and upserted in one all-or-nothing
 * transaction (no per-record review). Parents are resolved from the 10-digit
 * code structure: RR PPP MM BBB.
 */
final class ImportGeographyAction
{
    private const CHUNK = 1000;

    public function __construct(private readonly AdapterRegistry $adapters) {}

    public function handle(ImportBatch $batch): void
    {
        $adapter = $this->adapters->geographyAdapter($batch->source_name);
        $path = Storage::disk(config('communitycare.imports.disk'))->path($batch->file_path);
        $release = $batch->source_version;

        $batch->update(['status' => ImportBatchStatus::Running, 'current_step' => ImportStep::Normalize, 'started_at' => now()]);

        $levels = [];
        foreach ($adapter->read($path) as $record) {
            $levels[$record->level][] = $record;
        }

        if ($levels === []) {
            throw ImportFileInvalid::empty();
        }

        $counts = DB::transaction(function () use ($levels, $release): array {
            $counts = ['created' => 0, 'updated' => 0, 'orphaned' => 0];

            $this->upsert(Region::class, $levels[GeoRecordData::REGION] ?? [], $release, $counts, fn (): array => []);

            $regions = Region::query()->pluck('id', 'psgc_code')->all();
            $provinceRecords = [...($levels[GeoRecordData::PROVINCE] ?? []), ...($levels[GeoRecordData::DISTRICT] ?? [])];
            $this->upsert(Province::class, $provinceRecords, $release, $counts, fn (GeoRecordData $record): ?array => ($regionId = $regions[self::regionCode($record->code)] ?? null) === null ? null : [
                'region_id' => $regionId,
                'is_district' => $record->level === GeoRecordData::DISTRICT,
            ]);

            $provinces = Province::query()->pluck('id', 'psgc_code')->all();
            $cityRecords = [
                ...($levels[GeoRecordData::CITY] ?? []),
                ...($levels[GeoRecordData::MUNICIPALITY] ?? []),
                ...($levels[GeoRecordData::SUB_MUNICIPALITY] ?? []),
            ];
            $this->upsert(CityMunicipality::class, $cityRecords, $release, $counts, function (GeoRecordData $record) use ($regions, $provinces): ?array {
                $regionId = $regions[self::regionCode($record->code)] ?? null;
                if ($regionId === null) {
                    return null;
                }

                $provinceId = $provinces[substr($record->code, 0, 5).'00000'] ?? null;

                return [
                    'region_id' => $regionId,
                    'province_id' => $provinceId,
                    // Independent cities: the province they sit in geographically (browsing and maps only).
                    'geographic_province_id' => $provinceId === null && $record->geographicProvinceCode !== null ? ($provinces[$record->geographicProvinceCode] ?? null) : null,
                    'kind' => $record->level,
                ];
            });

            $cities = CityMunicipality::query()->pluck('id', 'psgc_code')->all();
            $this->upsert(Barangay::class, $levels[GeoRecordData::BARANGAY] ?? [], $release, $counts, fn (GeoRecordData $record): ?array => ($cityId = $cities[substr($record->code, 0, 7).'000'] ?? null) === null ? null : [
                'city_municipality_id' => $cityId,
            ]);

            return $counts;
        });

        $counts['total'] = array_sum(array_map('count', $levels));

        $batch->update([
            'status' => ImportBatchStatus::Published,
            'current_step' => ImportStep::Publish,
            'records_processed' => $counts['total'],
            'counts' => $counts,
            'finished_at' => now(),
            'published_at' => now(),
            'published_by' => $batch->started_by,
        ]);

        ImportBatchPublished::dispatch($batch->id, $batch->public_id, $counts, $batch->started_by);
    }

    private static function regionCode(string $code): string
    {
        return substr($code, 0, 2).'00000000';
    }

    /**
     * @param  class-string<Model>  $model
     * @param  list<GeoRecordData>  $records
     * @param  array{created: int, updated: int, orphaned: int}  $counts
     * @param  callable(GeoRecordData): (array<string, mixed>|null)  $parents  null = parent missing (orphan)
     */
    private function upsert(string $model, array $records, ?string $release, array &$counts, callable $parents): void
    {
        $existing = array_flip($model::query()->pluck('psgc_code')->all());
        $now = now();
        $rows = [];

        foreach ($records as $record) {
            $parent = $parents($record);
            if ($parent === null) {
                $counts['orphaned']++;

                continue;
            }

            $counts[isset($existing[$record->code]) ? 'updated' : 'created']++;
            $rows[] = ['psgc_code' => $record->code, 'name' => $record->name, 'psgc_release' => $release, 'created_at' => $now, 'updated_at' => $now, ...$parent];
        }

        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            $update = array_values(array_diff(array_keys($chunk[0]), ['psgc_code', 'created_at']));
            $model::query()->upsert($chunk, ['psgc_code'], $update);
        }
    }
}
