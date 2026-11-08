<?php

namespace App\Domain\Audit\Listeners;

use App\Domain\Audit\Models\AuditLog;
use App\Domain\Audit\Support\Redactor;
use App\Domain\Shared\Contracts\AuditableEvent;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Context;

/**
 * Queued and idempotent: a retried job finds the existing row by event_key
 * and writes nothing new. request_id and ip_masked come from the request
 * Context, which Laravel carries into queued jobs.
 */
final class WriteAuditLog implements ShouldQueue
{
    public int $tries = 5;

    /** @var list<int> */
    public array $backoff = [5, 30, 120];

    public function __construct(private readonly Redactor $redactor) {}

    public function handle(AuditableEvent $event): void
    {
        $entry = $event->toAuditEntry();

        AuditLog::query()->firstOrCreate(
            ['event_key' => $entry->eventKey],
            [
                'actor_id' => $entry->actorId,
                'action' => $entry->action,
                'resource_type' => $entry->resourceType,
                'resource_id' => $entry->resourceId,
                'before' => $entry->before === null ? null : $this->redactor->redact($entry->before),
                'after' => $entry->after === null ? null : $this->redactor->redact($entry->after),
                'ip_masked' => Context::get('ip_masked'),
                'request_id' => Context::get('request_id'),
                'created_at' => now(),
            ],
        );
    }
}
