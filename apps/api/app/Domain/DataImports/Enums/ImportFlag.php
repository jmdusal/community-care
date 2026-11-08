<?php

namespace App\Domain\DataImports\Enums;

enum ImportFlag: string
{
    case MissingName = 'missing_name';
    case MissingIdentifier = 'missing_identifier';
    case InvalidPsgc = 'invalid_psgc';
    case UnknownLocation = 'unknown_location';
    case CoordinatesOutOfBounds = 'coordinates_out_of_bounds';
    case CoordinateConflict = 'coordinate_conflict';
    case DuplicateCandidate = 'duplicate_candidate';

    public function label(): string
    {
        return match ($this) {
            self::MissingName => 'Missing facility name',
            self::MissingIdentifier => 'Missing source identifier',
            self::InvalidPsgc => 'Invalid PSGC code',
            self::UnknownLocation => 'PSGC code not found in the location tables',
            self::CoordinatesOutOfBounds => 'Coordinates outside the Philippines (ignored)',
            self::CoordinateConflict => 'Coordinates differ from the published record',
            self::DuplicateCandidate => 'Possible duplicate of an existing facility',
        };
    }

    /** Flags that need a reviewer's decision before the record can be published. */
    public function blocksPublishing(): bool
    {
        return in_array($this, [self::MissingIdentifier, self::CoordinateConflict, self::DuplicateCandidate, self::UnknownLocation], true);
    }
}
