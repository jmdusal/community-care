<?php

namespace App\Domain\Geography\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/** Cached map position and boundary of a PSGC area. */
#[Fillable(['psgc_code', 'level', 'status', 'latitude', 'longitude', 'bbox', 'geojson', 'matched_name', 'source', 'fetched_at'])]
class AreaGeometry extends Model
{
    public const FOUND = 'found';

    public const NOT_FOUND = 'not_found';

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'bbox' => 'array',
            'geojson' => 'array',
            'fetched_at' => 'datetime',
        ];
    }
}
