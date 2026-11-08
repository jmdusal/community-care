<?php

namespace App\Domain\HealthPrograms\Exceptions;

use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

final class ProgramNotPublishable extends ConflictHttpException
{
    public static function ended(): self
    {
        return new self('This program has already ended. Change its end date before publishing.');
    }

    public static function noFacilities(): self
    {
        return new self('Add at least one participating facility before publishing.');
    }
}
