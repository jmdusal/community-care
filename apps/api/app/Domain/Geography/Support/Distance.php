<?php

namespace App\Domain\Geography\Support;

/**
 * Great-circle distance for checks done in PHP (for example import coordinate
 * conflicts). Database searches use ST_Distance_Sphere instead.
 */
final class Distance
{
    private const EARTH_RADIUS_KM = 6371.0088;

    /** Philippine bounding box with a small margin; coordinates outside it are rejected. */
    public const PH_BOUNDS = ['min_lat' => 4.2, 'max_lat' => 21.5, 'min_lng' => 116.0, 'max_lng' => 127.0];

    public static function km(float $fromLat, float $fromLng, float $toLat, float $toLng): float
    {
        $dLat = deg2rad($toLat - $fromLat);
        $dLng = deg2rad($toLng - $fromLng);

        $a = sin($dLat / 2) ** 2 + cos(deg2rad($fromLat)) * cos(deg2rad($toLat)) * sin($dLng / 2) ** 2;

        return 2 * self::EARTH_RADIUS_KM * asin(min(1.0, sqrt($a)));
    }

    public static function isInPhilippines(float $lat, float $lng): bool
    {
        return $lat >= self::PH_BOUNDS['min_lat'] && $lat <= self::PH_BOUNDS['max_lat']
            && $lng >= self::PH_BOUNDS['min_lng'] && $lng <= self::PH_BOUNDS['max_lng'];
    }
}
