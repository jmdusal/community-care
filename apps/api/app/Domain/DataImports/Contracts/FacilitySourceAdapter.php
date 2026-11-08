<?php

namespace App\Domain\DataImports\Contracts;

use App\Domain\DataImports\Data\FacilityRecordData;
use App\Domain\DataImports\Exceptions\ImportFileInvalid;

/**
 * Reads one source's file format into normalized facility records.
 * New sources are added by adding an implementation, never by editing the pipeline.
 */
interface FacilitySourceAdapter
{
    /** Stored on import_batches.source_name and facility_sources.source_name, e.g. "doh_nhfr". */
    public function key(): string;

    public function label(): string;

    /**
     * @return iterable<FacilityRecordData>
     *
     * @throws ImportFileInvalid when the file cannot be read or required columns are missing
     */
    public function read(string $path): iterable;
}
