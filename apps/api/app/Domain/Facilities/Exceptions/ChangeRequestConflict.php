<?php

namespace App\Domain\Facilities\Exceptions;

use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/** Rendered as 409 conflict. */
final class ChangeRequestConflict extends ConflictHttpException
{
    public static function selfApproval(): self
    {
        return new self('You submitted this change, so another reviewer must approve it (four-eyes review).');
    }

    public static function alreadyDecided(string $status): self
    {
        return new self("This change request is already {$status}.");
    }

    /** @param list<string> $fields */
    public static function recordChanged(array $fields): self
    {
        return new self('The facility changed since this request was made ('.implode(', ', $fields).'). Reject it and ask for a new request.');
    }

    public static function notSubmitter(): self
    {
        return new self('Only the person who submitted a change request can withdraw it.');
    }
}
