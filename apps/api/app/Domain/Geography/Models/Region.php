<?php

namespace App\Domain\Geography\Models;

use App\Domain\Facilities\Models\Facility;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['psgc_code', 'name', 'psgc_release'])]
class Region extends Model
{
    /** @return HasMany<Province, $this> */
    public function provinces(): HasMany
    {
        return $this->hasMany(Province::class);
    }

    /** @return HasMany<CityMunicipality, $this> */
    public function citiesMunicipalities(): HasMany
    {
        return $this->hasMany(CityMunicipality::class);
    }

    /** @return HasMany<Facility, $this> */
    public function facilities(): HasMany
    {
        return $this->hasMany(Facility::class);
    }
}
