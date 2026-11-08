<?php

namespace App\Domain\Audit;

use App\Domain\Audit\Listeners\WriteAuditLog;
use App\Domain\Shared\Contracts\AuditableEvent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

final class AuditServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Listening on the interface: every AuditableEvent from any module is recorded.
        Event::listen(AuditableEvent::class, WriteAuditLog::class);
    }
}
