<?php

namespace App\Domain\Geography\Models;

use App\Domain\Facilities\Models\Facility;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['region_id', 'province_id', 'geographic_province_id', 'psgc_code', 'name', 'kind', 'psgc_release'])]
class CityMunicipality extends Model
{
    protected $table = 'cities_municipalities';

    /** @return BelongsTo<Region, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    /** @return BelongsTo<Province, $this> */
    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    /** @return HasMany<Barangay, $this> */
    /** Independent cities only: the province they sit in geographically (not an administrative parent). */
    public function geographicProvince(): BelongsTo
    {
        return $this->belongsTo(Province::class, 'geographic_province_id');
    }

    public function isIndependent(): bool
    {
        return $this->province_id === null && $this->kind === 'city';
    }

    public function barangays(): HasMany
    {
        return $this->hasMany(Barangay::class);
    }

    /** @return HasMany<Facility, $this> */
    public function facilities(): HasMany
    {
        return $this->hasMany(Facility::class);
    }
}
