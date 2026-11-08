<?php

namespace App\Domain\Facilities\Enums;

enum ChangeOrigin: string
{
    /** A new facility proposed by an admin or verifier. */
    case Create = 'create';

    /** A correction to an existing record. */
    case Edit = 'edit';
}
