<?php

namespace Tests\Feature\Operations;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class OperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_preflight_fails_on_unsafe_settings(): void
    {
        config(['app.debug' => true, 'app.url' => 'http://example.test']);
        $this->userWithRole(RoleName::SystemAdmin, ['email' => config('communitycare.super_admin.email'), 'password' => 'password']);

        $this->artisan('communitycare:preflight')
            ->expectsOutputToContain('APP_DEBUG is off')
            ->expectsOutputToContain('still has the password "password"')
            ->assertFailed();
    }

    public function test_preflight_passes_with_production_settings(): void
    {
        config([
            'app.debug' => false, 'app.url' => 'https://api.example.ph', 'communitycare.frontend_url' => 'https://example.ph',
            'session.secure' => true, 'communitycare.two_factor.enforced' => true, 'communitycare.remember_me_days' => 30,
            'broadcasting.default' => 'reverb', 'broadcasting.connections.reverb.options.scheme' => 'https', 'queue.default' => 'database',
        ]);
        $this->userWithRole(RoleName::SystemAdmin, ['email' => config('communitycare.super_admin.email'), 'password' => 'a-long-unique-password']);

        $this->artisan('communitycare:preflight')->assertSuccessful();
    }

    public function test_health_reports_a_stuck_queue(): void
    {
        config(['queue.default' => 'database']);
        $this->getJson('/api/v1/health')->assertOk()->assertJsonPath('data.checks.queue', 'ok');

        DB::table('jobs')->insert(['queue' => 'default', 'payload' => '{}', 'attempts' => 0, 'available_at' => now()->subMinutes(10)->getTimestamp(), 'created_at' => now()->subMinutes(10)->getTimestamp()]);

        $this->getJson('/api/v1/health')->assertStatus(503)->assertJsonPath('data.status', 'degraded')->assertJsonPath('data.checks.queue', 'fail');
    }

    /** Needs the MySQL client tools (MYSQLDUMP_PATH, MYSQL_PATH); skipped where they are missing. */
    public function test_a_backup_restores_with_the_same_data(): void
    {
        if (! is_executable((string) config('communitycare.backups.mysqldump')) && trim((string) shell_exec('command -v '.escapeshellarg((string) config('communitycare.backups.mysqldump')))) === '') {
            $this->markTestSkipped('mysqldump is not available.');
        }

        config(['communitycare.backups.directory' => storage_path('framework/testing/backups')]);
        Facility::factory()->count(3)->create();
        DB::commit(); // RefreshDatabase wraps tests in a transaction; mysqldump only sees committed rows.

        try {
            $this->artisan('communitycare:backup')->assertSuccessful();
            $this->artisan('communitycare:restore-check')->expectsOutputToContain('Restore test passed')->assertSuccessful();
        } finally {
            DB::table('facilities')->delete();
            DB::beginTransaction();
            array_map('unlink', glob(storage_path('framework/testing/backups/*')) ?: []);
        }
    }
}
