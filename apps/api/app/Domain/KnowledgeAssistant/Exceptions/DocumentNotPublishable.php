<?php

namespace App\Domain\KnowledgeAssistant\Exceptions;

use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

final class DocumentNotPublishable extends ConflictHttpException
{
    public static function notVerified(): self
    {
        return new self('Set the date the content was verified against its source before publishing.');
    }
}
