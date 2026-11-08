<?php

namespace App\Domain\Geography\Contracts;

use App\Domain\Geography\Data\GeocodedArea;

/** Finds where a named Philippine area is. Swappable (Nominatim today; any geocoder later). */
interface AreaGeocoder
{
    public function name(): string;

    /** @param list<string> $queries tried in order, most specific first */
    public function locate(array $queries): ?GeocodedArea;
}
