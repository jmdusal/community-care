<?php

namespace App\Domain\DataImports\Support;

use App\Domain\DataImports\Adapters\MappedCsvFacilityAdapter;
use App\Domain\DataImports\Adapters\PsgcCsvAdapter;
use App\Domain\DataImports\Adapters\PsgcJsonAdapter;
use App\Domain\DataImports\Contracts\FacilitySourceAdapter;
use App\Domain\DataImports\Contracts\GeographySourceAdapter;
use App\Domain\DataImports\Enums\ImportKind;
use InvalidArgumentException;

/**
 * Builds adapters from config('communitycare.imports'). Adding a source is a
 * configuration change (or a new adapter class), not a pipeline change.
 */
final class AdapterRegistry
{
    /**
     * @param  array<string, array{label: string, columns: array<string, string|null>}>  $facilitySources
     * @param  array<string, array{label: string, format?: string, base_url?: string, columns: array<string, string>}>  $geographySources
     */
    public function __construct(
        private readonly array $facilitySources,
        private readonly array $geographySources,
    ) {}

    public function kindOf(string $key): ImportKind
    {
        return match (true) {
            array_key_exists($key, $this->facilitySources) => ImportKind::Facilities,
            array_key_exists($key, $this->geographySources) => ImportKind::Geography,
            default => throw new InvalidArgumentException("Unknown import source [{$key}]."),
        };
    }

    public function facilityAdapter(string $key): FacilitySourceAdapter
    {
        $source = $this->facilitySources[$key] ?? throw new InvalidArgumentException("Unknown facility source [{$key}].");

        return new MappedCsvFacilityAdapter($key, $source['label'], $source['columns']);
    }

    public function geographyAdapter(string $key): GeographySourceAdapter
    {
        $source = $this->geographySources[$key] ?? throw new InvalidArgumentException("Unknown geography source [{$key}].");

        return match ($source['format'] ?? 'csv') {
            'psgc_json' => new PsgcJsonAdapter($key, $source['label']),
            default => new PsgcCsvAdapter($key, $source['label'], $source['columns']),
        };
    }

    /** @return list<FacilitySourceAdapter> */
    public function facilityAdapters(): array
    {
        return array_map(fn (string $key): FacilitySourceAdapter => $this->facilityAdapter($key), array_keys($this->facilitySources));
    }

    /** @return list<array{key: string, label: string, kind: string, columns: array<string, string|null>}> */
    public function describe(): array
    {
        $describe = fn (array $sources, ImportKind $kind): array => array_map(
            fn (string $key, array $source): array => ['key' => $key, 'label' => $source['label'], 'kind' => $kind->value, 'columns' => $source['columns']],
            array_keys($sources),
            $sources,
        );

        return [...$describe($this->facilitySources, ImportKind::Facilities), ...$describe($this->geographySources, ImportKind::Geography)];
    }
}
