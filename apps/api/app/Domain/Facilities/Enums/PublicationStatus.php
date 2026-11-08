<?php

namespace App\Domain\Facilities\Enums;

enum PublicationStatus: string
{
    case Unpublished = 'unpublished';
    case Published = 'published';
    case Withdrawn = 'withdrawn';
}
