<?php

namespace App\Domain\Facilities\Enums;

enum ChangeRequestStatus: string
{
    case Submitted = 'submitted';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Withdrawn = 'withdrawn';
}
