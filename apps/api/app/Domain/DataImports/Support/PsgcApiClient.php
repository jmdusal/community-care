<?php

namespace App\Domain\DataImports\Support;

use App\Domain\DataImports\Data\GeoRecordData;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * Downloads the full PSGC list from the public PSGC API and reduces it to
 * [10-digit code, name, level] rows for PsgcJsonAdapter. Barangays are fetched
 * region by region to keep memory low (about 42,000 rows in total).
 */
final class PsgcApiClient
{
    public function __construct(private readonly string $baseUrl) {}

    /** @return array{release: string, source: string, records: list<array{0: string, 1: string, 2: string, 3?: string}>} */
    public function snapshot(): array
    {
        $records = [];
        $regions = $this->get('regions.json');

        foreach ($regions as $region) {
            $records[] = [$region['psgc10DigitCode'] ?? '', self::regionName($region), GeoRecordData::REGION];
        }

        $provinceCodes = [];
        foreach ($this->get('provinces.json') as $province) {
            $records[] = [$province['psgc10DigitCode'] ?? '', $province['name'], GeoRecordData::PROVINCE];
            $provinceCodes[$province['code']] = $province['psgc10DigitCode'] ?? null;
        }

        foreach ($this->get('cities-municipalities.json') as $place) {
            $code = (string) ($place['psgc10DigitCode'] ?? '');
            $geographicProvince = $provinceCodes[$place['provinceCode'] ?? ''] ?? null;

            // Independent cities have their own province-level code; keep the province they sit in.
            $independent = $geographicProvince !== null && substr($code, 0, 5) !== substr($geographicProvince, 0, 5);

            $records[] = [$code, $place['name'], ($place['isCity'] ?? false) ? GeoRecordData::CITY : GeoRecordData::MUNICIPALITY, ...($independent ? [$geographicProvince] : [])];
        }

        foreach ($this->get('sub-municipalities.json') as $place) {
            $records[] = [$place['psgc10DigitCode'] ?? '', $place['name'], GeoRecordData::SUB_MUNICIPALITY];
        }

        foreach ($regions as $region) {
            foreach ($this->get("regions/{$region['code']}/barangays.json") as $barangay) {
                $records[] = [$barangay['psgc10DigitCode'] ?? '', $barangay['name'], GeoRecordData::BARANGAY];
            }
        }

        return [
            'release' => 'psgc-api-'.now()->toDateString(),
            'source' => $this->baseUrl,
            'records' => array_values(array_filter($records, fn (array $record): bool => preg_match('/^\d{10}$/', (string) $record[0]) === 1)),
        ];
    }

    /** "Region IV-A (CALABARZON)", "National Capital Region (NCR)", "MIMAROPA Region". */
    private static function regionName(array $region): string
    {
        $official = trim((string) ($region['regionName'] ?? ''));
        $name = trim((string) ($region['name'] ?? ''));

        return $official === '' || $official === $name ? $name : "{$official} ({$name})";
    }

    /** @return list<array<string, mixed>> */
    private function get(string $path): array
    {
        return $this->http()->get($path)->throw()->json() ?? [];
    }

    private function http(): PendingRequest
    {
        return Http::baseUrl(rtrim($this->baseUrl, '/').'/')
            ->acceptJson()
            ->timeout(60)
            ->retry(3, 1000, throw: true);
    }
}
