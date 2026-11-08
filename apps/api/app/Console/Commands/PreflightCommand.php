<?php

namespace App\Console\Commands;

use App\Domain\Geography\Models\Barangay;
use App\Domain\Geography\Models\Region;
use App\Domain\Identity\Models\User;
use App\Domain\Settings\Contracts\SettingsRepository;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Database\Migrations\Migrator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Throwable;

/**
 * Go-live checks for a server. FAIL blocks a pilot (exit code 1); WARN should be fixed
 * or consciously accepted; OK is fine. Run it on the server after every deployment.
 */
#[Signature('communitycare:preflight')]
#[Description('Check that this server is safe to run the pilot (security, data, operations)')]
final class PreflightCommand extends Command
{
    /** @var list<array{0: string, 1: string, 2: string}> */
    private array $results = [];

    public function handle(SettingsRepository $settings, Migrator $migrator): int
    {
        $https = fn (?string $url): bool => str_starts_with((string) $url, 'https://');

        // Security
        $this->check('APP_DEBUG is off', ! config('app.debug'), 'FAIL', 'Set APP_DEBUG=false: debug pages show secrets and code.');
        $this->check('APP_KEY is set', filled(config('app.key')), 'FAIL', 'Run php artisan key:generate.');
        $this->check('Environment is production', app()->environment('production'), 'WARN', 'Set APP_ENV=production on the pilot server.');
        $this->check('API address uses HTTPS', $https(config('app.url')), 'FAIL', 'APP_URL must start with https://.');
        $this->check('Web app address uses HTTPS', $https(config('communitycare.frontend_url')), 'FAIL', 'FRONTEND_URL must start with https://.');
        $this->check('Session cookies are HTTPS-only', (bool) config('session.secure'), 'FAIL', 'Set SESSION_SECURE_COOKIE=true.');
        $this->check('Super admin password changed', ! $this->superAdminUsesDefaultPassword(), 'FAIL', 'admin@admin.com still has the password "password". Change it.');
        $this->check('Two-factor sign-in enforced', (bool) config('communitycare.two_factor.enforced') && $settings->bool('security.require_mfa_for_staff'), 'FAIL', 'Keep TWO_FACTOR_ENFORCED=true and the "Require two-factor" setting on.');
        $this->check('"Keep me signed in" is 30 days or less', (int) config('communitycare.remember_me_days') <= 30, 'WARN', 'Set REMEMBER_ME_DAYS=30 (or less) for the pilot.');
        $this->check('Telescope is off', ! (bool) env('TELESCOPE_ENABLED', false) || ! app()->environment('production'), 'FAIL', 'Set TELESCOPE_ENABLED=false in production.');
        $this->check('Real-time server uses TLS', config('broadcasting.default') !== 'reverb' || config('broadcasting.connections.reverb.options.scheme') === 'https', 'FAIL', 'Set REVERB_SCHEME=https and serve Reverb behind TLS.');

        // Operations
        $this->check('Database migrations are up to date', $this->noPendingMigrations($migrator), 'FAIL', 'Run php artisan migrate --force.');
        $this->check('Queue runs in the background', config('queue.default') !== 'sync', 'WARN', 'Use QUEUE_CONNECTION=database or redis and keep php artisan queue:work running.');
        $this->check('No failed jobs', $this->failedJobs() === 0, 'WARN', "{$this->failedJobs()} failed job(s): php artisan queue:failed, then retry or forget.");
        $this->check('Email is really sent', ! in_array(config('mail.default'), ['log', 'array'], true), 'WARN', 'MAIL_MAILER=log only writes emails to the log. Configure SMTP or a mail service.');
        $this->check('A recent backup exists', $this->hasRecentBackup(), 'WARN', 'Run php artisan communitycare:backup and schedule it daily.');

        // Data
        $this->check('All Philippine places are loaded', Region::query()->count() >= 17 && Barangay::query()->count() >= 40000, 'WARN', 'Run php artisan communitycare:sync-geography --sync.');
        $this->check('AI provider is configured', config('communitycare.assistant.provider') !== 'claude' || filled(config('communitycare.assistant.claude.api_key')), 'WARN', 'ASSISTANT_PROVIDER=claude needs ANTHROPIC_API_KEY (the grounded provider answers until then).');

        $this->table(['', 'Check', 'What to do'], array_map(fn (array $row): array => [$row[0], $row[1], $row[0] === 'OK' ? '' : $row[2]], $this->results));

        $failed = count(array_filter($this->results, fn (array $row): bool => $row[0] === 'FAIL'));
        $warned = count(array_filter($this->results, fn (array $row): bool => $row[0] === 'WARN'));

        if ($failed > 0) {
            $this->error("{$failed} check(s) failed. Not ready for the pilot.");

            return self::FAILURE;
        }

        $warned > 0 ? $this->warn("Ready, with {$warned} warning(s) to review.") : $this->info('Ready for the pilot.');

        return self::SUCCESS;
    }

    private function check(string $label, bool $passed, string $severity, string $advice): void
    {
        $this->results[] = [$passed ? 'OK' : $severity, $label, $advice];
    }

    private function superAdminUsesDefaultPassword(): bool
    {
        $admin = User::query()->where('email', config('communitycare.super_admin.email'))->first();

        return $admin !== null && Hash::check('password', $admin->password);
    }

    private function noPendingMigrations(Migrator $migrator): bool
    {
        try {
            $ran = $migrator->getRepository()->getRan();
            $files = array_keys($migrator->getMigrationFiles([database_path('migrations')]));

            return array_diff($files, $ran) === [];
        } catch (Throwable) {
            return false;
        }
    }

    private function failedJobs(): int
    {
        try {
            return DB::table('failed_jobs')->count();
        } catch (Throwable) {
            return 0;
        }
    }

    private function hasRecentBackup(): bool
    {
        $files = glob(storage_path('app/backups/*.sql.gz')) ?: [];

        return $files !== [] && max(array_map('filemtime', $files)) > now()->subDays(2)->getTimestamp();
    }
}
