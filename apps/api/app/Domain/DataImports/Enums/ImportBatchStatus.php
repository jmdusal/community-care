<?php

namespace App\Domain\DataImports\Enums;

enum ImportBatchStatus: string
{
    case Queued = 'queued';
    case Running = 'running';
    case NeedsReview = 'needs_review';
    case ReadyToPublish = 'ready_to_publish';
    case Published = 'published';
    case Failed = 'failed';

    public function canBeReviewed(): bool
    {
        return $this === self::NeedsReview || $this === self::ReadyToPublish;
    }
}
