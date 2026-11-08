<?php

namespace App\Domain\Shared\Contracts;

use App\Domain\Shared\Data\AuditEntryData;

/**
 * A domain event that should be recorded in the audit log.
 * The Audit module listens for this interface, so any module can be audited
 * without the Audit module knowing about it (dependency inversion).
 */
interface AuditableEvent
{
    public function toAuditEntry(): AuditEntryData;
}
