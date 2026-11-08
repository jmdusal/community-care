<?php

namespace App\Console\Commands;

use App\Domain\Operations\DatabaseBackup;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Throwable;

/** The recovery test: a backup only counts once it has been restored somewhere. */
#[Signature('communitycare:restore-check {file? : A backup file (default: the newest)}')]
#[Description('Restore a backup into a temporary database and check the data arrived')]
final class RestoreCheckCommand extends Command
{
    public function handle(DatabaseBackup $backups): int
    {
        $file = $this->argument('file') ?: ($backups->all()[0] ?? null);
        if ($file === null || ! is_file($file)) {
            $this->error('No backup found. Run php artisan communitycare:backup first.');

            return self::FAILURE;
        }

        $this->info("Restoring {$file} into a temporary database…");
        $started = microtime(true);

        try {
            $results = $backups->verify($file);
        } catch (Throwable $exception) {
            $this->error('Restore failed: '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->table(['Table', 'Rows in backup', 'Rows now', ''], array_map(fn (array $r): array => [$r['table'], $r['backup'], $r['live'], $r['ok'] ? 'OK' : 'CHECK'], $results));
        $seconds = round(microtime(true) - $started, 1);

        if (in_array(false, array_column($results, 'ok'), true)) {
            $this->error("The restore finished in {$seconds}s but some tables look wrong. Investigate before relying on this backup.");

            return self::FAILURE;
        }

        $this->info("Restore test passed in {$seconds}s. The temporary database was removed.");

        return self::SUCCESS;
    }
}
