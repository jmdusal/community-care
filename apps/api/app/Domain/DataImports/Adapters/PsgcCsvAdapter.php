<?php

namespace App\Domain\DataImports\Adapters;

use App\Domain\DataImports\Contracts\GeographySourceAdapter;
use App\Domain\DataImports\Data\GeoRecordData;
use App\Domain\DataImports\Exceptions\ImportFileInvalid;
use App\Domain\DataImports\Support\CsvReader;

/**
 * Reads a PSA PSGC release saved as CSV. Column names come from configuration.
 * Rows whose geographic level is not recognised are skipped.
 */
final class PsgcCsvAdapter implements GeographySourceAdapter
{
    /** PSA "Geographic Level" values mapped to our levels. */
    private const LEVELS = [
        'reg' => GeoRecordData::REGION,
        'prov' => GeoRecordData::PROVINCE,
        'dist' => GeoRecordData::DISTRICT,
        'city' => GeoRecordData::CITY,
        'mun' => GeoRecordData::MUNICIPALITY,
        'submun' => GeoRecordData::SUB_MUNICIPALITY,
        'bgy' => GeoRecordData::BARANGAY,
    ];

    /** @param array{code: string, name: string, level: string} $columns */
    public function __construct(
        private readonly string $key,
        private readonly string $label,
        private readonly array $columns,
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
        ['header' => $header, 'rows' => $rows] = CsvReader::open($path);

        $missing = array_values(array_diff(array_values($this->columns), $header));
        if ($missing !== []) {
            throw ImportFileInvalid::missingColumns($missing);
        }

        foreach ($rows as $row) {
            $code = (string) preg_replace('/\D/', '', $row[$this->columns['code']]);
            $level = self::LEVELS[strtolower(str_replace([' ', '-'], '', $row[$this->columns['level']]))] ?? null;
            $name = trim($row[$this->columns['name']]);

            if ($level === null || strlen($code) !== 10 || $name === '') {
                continue;
            }

            yield new GeoRecordData($code, $name, $level);
        }
    }
}
