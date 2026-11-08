<?php

namespace Tests\Feature\Domain\Audit;

use App\Domain\Audit\Listeners\WriteAuditLog;
use App\Domain\Settings\Events\SettingUpdated;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Context;
use Tests\TestCase;

final class WriteAuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_listener_is_queued(): void
    {
        $this->assertContains(ShouldQueue::class, class_implements(WriteAuditLog::class));
    }

    public function test_handling_the_same_event_twice_writes_one_row(): void
    {
        $event = new SettingUpdated('api.max_page_size', 50, 40, null);
        $listener = app(WriteAuditLog::class);

        $listener->handle($event);
        $listener->handle($event);

        $this->assertDatabaseCount('audit_logs', 1);
    }

    public function test_request_context_is_recorded_with_the_entry(): void
    {
        Context::add('request_id', 'req_test_0001');
        Context::add('ip_masked', '203.177.x.x');

        app(WriteAuditLog::class)->handle(new SettingUpdated('api.max_page_size', 50, 40, null));

        $this->assertDatabaseHas('audit_logs', ['request_id' => 'req_test_0001', 'ip_masked' => '203.177.x.x']);
    }
}
