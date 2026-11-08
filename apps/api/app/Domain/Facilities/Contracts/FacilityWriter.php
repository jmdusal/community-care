<?php

namespace App\Domain\Facilities\Contracts;

use App\Domain\DataImports\Data\FacilityRecordData;
use App\Domain\Facilities\Models\Facility;

interface FacilityWriter
{
    /**
     * Create or update a facility from an approved import record and record
     * where it came from. Callers own the transaction and the events.
     */
    public function applyImportedRecord(FacilityRecordData $record, string $sourceName, ?int $facilityId, ?int $actorId): Facility;

    /**
     * Apply reviewed changes (FacilitySnapshot shape, "after" values only) and
     * mark the record verified by the reviewer.
     *
     * @param  array<string, mixed>  $after
     */
    public function applyReviewedChanges(Facility $facility, array $after, int $reviewerId): Facility;

    /** Mark a source record as checked (re-imported with no changes). */
    public function touchSource(string $sourceName, string $sourceRecordId): void;

    public function setLocation(Facility $facility, float $latitude, float $longitude): void;
}
