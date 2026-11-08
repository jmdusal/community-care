<?php

namespace App\Domain\HealthPrograms\Enums;

enum ProgramStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Archived = 'archived';
}
