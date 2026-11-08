<?php

namespace App\Domain\DataImports\Adapters;

use App\Domain\DataImports\Contracts\FacilitySourceAdapter;
use App\Domain\DataImports\Data\FacilityRecordData;
use App\Domain\DataImports\Exceptions\ImportFileInvalid;
use App\Domain\DataImports\Support\CsvReader;

/**
 * A facility CSV whose column names come from configuration (data-driven).
 * The DOH NHFR export and the CommunityCare template are both instances of this
 * adapter with different mappings in config/communitycare.php.
 */
final class MappedCsvFacilityAdapter implements FacilitySourceAdapter
{
    public const REQUIRED_FIELDS = ['source_record_id', 'name'];

    /**
     * @param  array<string, string|null>  $columns  field => column header in the file
     */
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

        $missing = array_values(array_filter(
            self::REQUIRED_FIELDS,
            fn (string $field): bool => ! in_array($this->columns[$field] ?? null, $header, true),
        ));

        if ($missing !== []) {
            throw ImportFileInvalid::missingColumns(array_map(fn (string $field): string => (string) $this->columns[$field], $missing));
        }

        $yielded = false;
        foreach ($rows as $line => $row) {
            $yielded = true;
            yield $this->toRecord($line, $row);
        }

        if (! $yielded) {
            throw ImportFileInvalid::empty();
        }
    }

    /** @param array<string, string> $row */
    private function toRecord(int $line, array $row): FacilityRecordData
    {
        $value = fn (string $field): ?string => $this->clean($row[$this->columns[$field] ?? ''] ?? null);

        $contacts = [];
        foreach (['phone', 'email', 'website'] as $type) {
            foreach ($this->split($value($type), $type === 'phone' ? '/[;|\/]/' : '/[;|]/') as $contact) {
                $contacts[] = ['type' => $type, 'value' => $contact];
            }
        }

        return new FacilityRecordData(
            rowNumber: $line,
            sourceRecordId: $value('source_record_id'),
            name: $value('name'),
            typeName: $value('type'),
            address: $value('address'),
            regionCode: $this->psgc($value('region_code')),
            provinceCode: $this->psgc($value('province_code')),
            cityCode: $this->psgc($value('city_code')),
            barangayCode: $this->psgc($value('barangay_code')),
            latitude: $this->coordinate($value('latitude')),
            longitude: $this->coordinate($value('longitude')),
            contacts: $contacts,
            services: $this->split($value('services'), '/[;|]/'),
        );
    }

    private function clean(?string $value): ?string
    {
        $value = $value === null ? null : trim(preg_replace('/\s+/u', ' ', $value) ?? '');

        return $value === '' || $value === null || in_array(strtolower($value), ['n/a', 'na', 'none', '-', 'null'], true) ? null : $value;
    }

    /** Keeps digits only, so "0405802000" and "04-058-02-000" both become "0405802000". */
    private function psgc(?string $value): ?string
    {
        $digits = $value === null ? '' : (string) preg_replace('/\D/', '', $value);

        return $digits === '' ? null : $digits;
    }

    private function coordinate(?string $value): ?float
    {
        return $value !== null && is_numeric($value) ? round((float) $value, 6) : null;
    }

    /**
     * Splits a multi-value cell. Phone numbers may also be separated by "/";
     * other values may not, because websites contain slashes.
     *
     * @return list<string>
     */
    private function split(?string $value, string $separators): array
    {
        if ($value === null) {
            return [];
        }

        return array_values(array_filter(array_map('trim', preg_split($separators, $value) ?: []), fn (string $part): bool => $part !== ''));
    }
}
