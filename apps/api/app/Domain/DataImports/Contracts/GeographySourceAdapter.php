<?php

namespace App\Domain\DataImports\Contracts;

use App\Domain\DataImports\Data\GeoRecordData;
use App\Domain\DataImports\Exceptions\ImportFileInvalid;

interface GeographySourceAdapter
{
    public function key(): string;

    public function label(): string;

    /**
     * @return iterable<GeoRecordData>
     *
     * @throws ImportFileInvalid
     */
    public function read(string $path): iterable;
}
