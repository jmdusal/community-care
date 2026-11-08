<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

final class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'database' => $this->check(fn () => DB::select('select 1')),
            'cache' => $this->check(function (): void {
                Cache::put('health:ping', 'pong', 10);
                if (Cache::get('health:ping') !== 'pong') {
                    throw new \RuntimeException('Cache read-back failed.');
                }
            }),
            // A queue is unhealthy when work waits too long (no worker running) or keeps failing.
            'queue' => $this->check(function (): void {
                if (config('queue.default') !== 'database') {
                    return;
                }
                $oldest = DB::table('jobs')->whereNull('reserved_at')->min('available_at');
                if ($oldest !== null && $oldest < now()->subMinutes(5)->getTimestamp()) {
                    throw new \RuntimeException('Jobs have waited more than 5 minutes. Is php artisan queue:work running?');
                }
                if (DB::table('failed_jobs')->where('failed_at', '>', now()->subDay())->count() > 0) {
                    throw new \RuntimeException('Jobs failed in the last 24 hours.');
                }
            }),
        ];

        $healthy = ! in_array('fail', $checks, true);

        return response()->json([
            'data' => [
                'status' => $healthy ? 'ok' : 'degraded',
                'checks' => $checks,
                'drivers' => [
                    'cache' => config('cache.default'),
                    'queue' => config('queue.default'),
                ],
                'time' => now()->setTimezone(config('communitycare.display_timezone'))->toIso8601String(),
            ],
        ], $healthy ? 200 : 503);
    }

    private function check(Closure $probe): string
    {
        try {
            $probe();

            return 'ok';
        } catch (Throwable $exception) {
            report($exception);

            return 'fail';
        }
    }
}
