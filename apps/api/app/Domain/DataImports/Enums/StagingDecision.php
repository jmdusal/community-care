<?php

namespace App\Domain\DataImports\Enums;

enum StagingDecision: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
