<?php

namespace App\Domain\Identity\Enums;

/** Where a role's permissions apply. */
enum RoleScope: string
{
    /** Every facility (system admins, verifiers). */
    case All = 'all';
    /** Only the facilities the member is assigned to (facility admins, staff). */
    case Assigned = 'assigned';
    /** No console access (patients). */
    case None = 'none';
}
