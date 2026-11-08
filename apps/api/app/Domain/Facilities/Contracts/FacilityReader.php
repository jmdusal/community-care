<?php

namespace App\Domain\Facilities\Contracts;

use App\Domain\Facilities\Data\FacilitySearchData;
use App\Domain\Facilities\Models\Facility;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/** Read side for the public directory: only published records are ever returned. */
interface FacilityReader
{
    /** @return LengthAwarePaginator<int, Facility> */
    public function search(FacilitySearchData $search): LengthAwarePaginator;

    public function findPublished(string $publicId): ?Facility;
}
