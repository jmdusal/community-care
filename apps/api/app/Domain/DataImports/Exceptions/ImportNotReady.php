<?php

namespace App\Domain\DataImports\Exceptions;

use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/** Rendered as 409 conflict by the API error renderer. */
final class ImportNotReady extends ConflictHttpException
{
    public static function pendingFlags(int $count): self
    {
        return new self("Review the {$count} flagged record(s) before publishing this batch.");
    }

    public static function status(string $status): self
    {
        return new self("This batch cannot be changed while it is {$status}.");
    }
}
