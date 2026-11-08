<?php

namespace App\Domain\KnowledgeAssistant\Enums;

enum DocumentStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Archived = 'archived';
}
