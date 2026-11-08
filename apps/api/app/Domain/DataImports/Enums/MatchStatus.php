<?php

namespace App\Domain\DataImports\Enums;

enum MatchStatus: string
{
    case New = 'new';
    case Updated = 'updated';
    case Unchanged = 'unchanged';
    case Invalid = 'invalid';
}
