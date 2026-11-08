<?php

namespace App\Domain\KnowledgeAssistant\Exceptions;

use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;

final class AssistantDisabled extends ServiceUnavailableHttpException
{
    public function __construct()
    {
        parent::__construct(null, 'The assistant is not available right now. Use the directory search instead.');
    }
}
