<?php

namespace App\Domain\Geography\Models;

use App\Domain\Facilities\Models\Facility;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['region_id', 'psgc_code', 'name', 'is_district', 'psgc_release'])]
class Province extends Model
{
    /** @return BelongsTo<Region, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    /** @return HasMany<CityMunicipality, $this> */
    public function citiesMunicipalities(): HasMany
    {
        return $this->hasMany(CityMunicipality::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['is_district' => 'boolean'];
    }

    /** @return HasMany<Facility, $this> */
    public function facilities(): HasMany
    {
        return $this->hasMany(Facility::class);
    }
}
