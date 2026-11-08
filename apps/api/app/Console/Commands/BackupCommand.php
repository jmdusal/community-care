<?php

namespace App\Console\Commands;

use App\Domain\Operations\DatabaseBackup;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Throwable;

#[Signature('communitycare:backup')]
#[Description('Back up the database (compressed SQL in storage/app/backups) and keep the newest copies')]
final class BackupCommand extends Command
{
    public function handle(DatabaseBackup $backups): int
    {
        try {
            $path = $backups->create();
        } catch (Throwable $exception) {
            $this->error('Backup failed: '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->info(sprintf('Backup saved: %s (%.1f MB)', $path, filesize($path) / 1_048_576));
        $removed = $backups->prune();
        if ($removed > 0) {
            $this->line("Removed {$removed} old backup(s).");
        }
        $this->line('Copy backups off this server too (another disk or cloud storage).');

        return self::SUCCESS;
    }
}
