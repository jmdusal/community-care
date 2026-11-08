<?php

namespace App\Domain\Facilities\Enums;

/**
 * The platform's own review state. Never a substitute for a regulator's license or accreditation.
 */
enum VerificationStatus: string
{
    case Draft = 'draft';
    case PendingReview = 'pending_review';
    case Verified = 'verified';
    case Rejected = 'rejected';
    case Stale = 'stale';
}
