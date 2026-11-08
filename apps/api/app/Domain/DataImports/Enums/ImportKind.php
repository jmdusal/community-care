<?php

namespace App\Domain\DataImports\Enums;

enum ImportKind: string
{
    /** Facility records: staged, matched, flagged, reviewed, then published. */
    case Facilities = 'facilities';

    /** PSGC reference data: validated and upserted in one step. */
    case Geography = 'geography';
}
