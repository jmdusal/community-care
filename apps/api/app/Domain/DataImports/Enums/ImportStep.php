<?php

namespace App\Domain\DataImports\Enums;

/** The pipeline from the technical documentation, section 11. */
enum ImportStep: string
{
    case Acquire = 'acquire';
    case Stage = 'stage';
    case Normalize = 'normalize';
    case Match = 'match';
    case Flag = 'flag';
    case Review = 'review';
    case Publish = 'publish';
}
