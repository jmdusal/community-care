<?php

namespace App\Domain\Analytics\Actions;

use App\Domain\Analytics\Models\UsageEvent;
use Illuminate\Http\Request;

/**
 * Records an anonymous usage count. The visitor hash rotates daily and is
 * salted with the app key, so it counts distinct visitors per day without
 * being able to identify or follow anyone.
 */
final class RecordUsageEventAction
{
    public function handle(Request $request, string $event, ?int $facilityId = null, ?int $regionId = null, ?string $query = null, ?int $resultCount = null): void
    {
        UsageEvent::query()->create([
            'event' => $event,
            'facility_id' => $facilityId,
            'region_id' => $regionId,
            'query_hash' => $query === null || trim($query) === '' ? null : hash('sha256', mb_strtolower(trim($query))),
            'visitor_hash' => hash_hmac('sha256', now()->toDateString().'|'.$request->ip().'|'.$request->userAgent(), (string) config('app.key')),
            'result_count' => $resultCount,
            'created_at' => now(),
        ]);
    }
}
