<?php

namespace App\Domain\Geography\Support;

use App\Domain\Geography\Models\Barangay;
use App\Domain\Geography\Models\CityMunicipality;
use App\Domain\Geography\Models\Province;
use App\Domain\Geography\Models\Region;

/**
 * Resolves PSGC codes to row ids. Loads each level once and keeps it in memory,
 * so a large import does one query per level instead of one per row.
 * Not a singleton: each import gets a fresh instance, so a long-running worker
 * never keeps stale codes.
 */
final class GeographyLookup
{
    /** @var array<string, array<string, int>> */
    private array $maps = [];

    /** @var array<string, array{id: int, region_id: int, province_id: int|null}>|null */
    private ?array $cities = null;

    public function regionId(?string $code): ?int
    {
        return $this->find('region', $code);
    }

    public function provinceId(?string $code): ?int
    {
        return $this->find('province', $code);
    }

    public function cityId(?string $code): ?int
    {
        return $this->cityContext($code)['id'] ?? null;
    }

    public function barangayId(?string $code): ?int
    {
        return $this->find('barangay', $code);
    }

    /** @return array{id: int, region_id: int, province_id: int|null}|null */
    public function cityContext(?string $code): ?array
    {
        if ($code === null || $code === '') {
            return null;
        }

        $this->cities ??= CityMunicipality::query()
            ->get(['id', 'psgc_code', 'region_id', 'province_id'])
            ->mapWithKeys(fn (CityMunicipality $city): array => [
                $city->psgc_code => ['id' => $city->id, 'region_id' => $city->region_id, 'province_id' => $city->province_id],
            ])
            ->all();

        return $this->cities[$code] ?? null;
    }

    private function find(string $level, ?string $code): ?int
    {
        if ($code === null || $code === '') {
            return null;
        }

        $this->maps[$level] ??= match ($level) {
            'region' => Region::query()->pluck('id', 'psgc_code')->all(),
            'province' => Province::query()->pluck('id', 'psgc_code')->all(),
            'barangay' => Barangay::query()->pluck('id', 'psgc_code')->all(),
        };

        return $this->maps[$level][$code] ?? null;
    }
}
