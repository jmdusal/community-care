<?php

namespace App\Domain\Shared\Events;

use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Support\Str;

/**
 * Base class for every domain event.
 *
 * - Dispatched only after the surrounding database transaction commits,
 *   so listeners never see uncommitted data.
 * - Carries a unique eventId that listeners use to stay idempotent.
 * - Subclasses carry IDs and minimal fields only: never personal contact
 *   details or medical data.
 */
abstract class DomainEvent implements ShouldDispatchAfterCommit
{
    use Dispatchable;

    public readonly string $eventId;

    public function __construct()
    {
        $this->eventId = (string) Str::ulid();
    }
}
