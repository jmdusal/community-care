<?php

namespace App\Domain\DataImports\Matching;

use App\Domain\Geography\Support\GeographyLookup;
use App\Domain\Settings\Contracts\SettingsRepository;

final class FacilityMatcherFactory
{
    public function __construct(private readonly SettingsRepository $settings) {}

    public function forSource(string $sourceName, GeographyLookup $geography): FacilityMatcher
    {
        return new FacilityMatcher(
            sourceName: $sourceName,
            geography: $geography,
            coordinateConflictKm: $this->settings->float('imports.coordinate_conflict_km'),
            duplicateSimilarity: $this->settings->int('imports.duplicate_name_similarity'),
        );
    }
}
