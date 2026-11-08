<?php

namespace App\Domain\DataImports\Adapters;

use App\Domain\DataImports\Contracts\GeographySourceAdapter;
use App\Domain\DataImports\Data\GeoRecordData;
use App\Domain\DataImports\Exceptions\ImportFileInvalid;
use JsonException;

/**
 * Reads a PSGC snapshot written by PsgcApiClient:
 * {"release": "...", "source": "...", "records": [["0100000000", "Region I (Ilocos Region)", "region"], ...]}
 * A fourth value on independent cities is the province they sit in geographically.
 */
final class PsgcJsonAdapter implements GeographySourceAdapter
{
    private const LEVELS = [
        GeoRecordData::REGION, GeoRecordData::PROVINCE, GeoRecordData::DISTRICT, GeoRecordData::CITY,
        GeoRecordData::MUNICIPALITY, GeoRecordData::SUB_MUNICIPALITY, GeoRecordData::BARANGAY,
    ];

    public function __construct(
        private readonly string $key,
        private readonly string $label,
    ) {}

    public function key(): string
    {
        return $this->key;
    }

    public function label(): string
    {
        return $this->label;
    }

    public function read(string $path): iterable
    {
        try {
            $snapshot = json_decode((string) file_get_contents($path), true, 8, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw ImportFileInvalid::empty();
        }

        foreach ($snapshot['records'] ?? [] as $record) {
            [$code, $name, $level, $geographicProvince] = array_pad(is_array($record) ? $record : [], 4, null);

            if (! is_string($code) || preg_match('/^\d{10}$/', $code) !== 1 || ! is_string($name) || trim($name) === '' || ! in_array($level, self::LEVELS, true)) {
                continue;
            }

            yield new GeoRecordData($code, trim($name), $level, is_string($geographicProvince) && preg_match('/^\d{10}$/', $geographicProvince) === 1 ? $geographicProvince : null);
        }
    }
}
