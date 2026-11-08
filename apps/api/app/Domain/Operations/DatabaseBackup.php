<?php

namespace App\Domain\Operations;

use Illuminate\Support\Facades\DB;
use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * MySQL backups as gzip-compressed SQL, and the restore test that proves they work.
 * The password is passed through the environment (MYSQL_PWD), never on the command line.
 */
final class DatabaseBackup
{
    /** @return string path of the new backup */
    public function create(): string
    {
        $db = $this->connection();
        $directory = (string) config('communitycare.backups.directory');
        if (! is_dir($directory) && ! mkdir($directory, 0750, true) && ! is_dir($directory)) {
            throw new RuntimeException("Cannot create {$directory}.");
        }

        $path = $directory.'/communitycare-'.now()->format('Ymd-His').'.sql.gz';
        $ignore = implode(' ', array_map(fn (string $table): string => '--ignore-table='.escapeshellarg($db['database'].'.'.$table), config('communitycare.backups.skip_tables', [])));

        $command = sprintf(
            '%s --single-transaction --quick --routines --no-tablespaces --set-gtid-purged=OFF -h %s -P %s -u %s %s %s | gzip -c > %s',
            escapeshellarg((string) config('communitycare.backups.mysqldump')),
            escapeshellarg($db['host']), escapeshellarg((string) $db['port']), escapeshellarg($db['username']),
            $ignore, escapeshellarg($db['database']), escapeshellarg($path),
        );

        $this->run(['bash', '-o', 'pipefail', '-c', $command], $db['password']);

        if (! is_file($path) || filesize($path) < 100) {
            throw new RuntimeException('The backup file is empty.');
        }

        return $path;
    }

    /** Deletes all but the newest N backups. @return int how many were deleted */
    public function prune(): int
    {
        $files = $this->all();
        $old = array_slice($files, (int) config('communitycare.backups.keep', 14));
        array_map('unlink', $old);

        return count($old);
    }

    /** @return list<string> newest first */
    public function all(): array
    {
        $files = glob(config('communitycare.backups.directory').'/communitycare-*.sql.gz') ?: [];
        usort($files, fn (string $a, string $b): int => filemtime($b) <=> filemtime($a) ?: strcmp($b, $a));

        return $files;
    }

    /**
     * Loads a backup into a temporary database and compares row counts with the live
     * database (the backup may only be older, never larger). The temporary database is
     * always dropped afterwards.
     *
     * @return list<array{table: string, backup: int, live: int, ok: bool}>
     */
    public function verify(string $path): array
    {
        $db = $this->connection();
        $scratch = $db['database'].'_restore_check';
        $client = sprintf('%s -h %s -P %s -u %s', escapeshellarg((string) config('communitycare.backups.mysql')), escapeshellarg($db['host']), escapeshellarg((string) $db['port']), escapeshellarg($db['username']));

        try {
            $this->run(['bash', '-c', "{$client} -e ".escapeshellarg("DROP DATABASE IF EXISTS `{$scratch}`; CREATE DATABASE `{$scratch}`")], $db['password']);
            $this->run(['bash', '-o', 'pipefail', '-c', 'gunzip -c '.escapeshellarg($path)." | {$client} ".escapeshellarg($scratch)], $db['password'], 900);

            $results = [];
            foreach (config('communitycare.backups.verify_tables', []) as $table) {
                $backup = (int) DB::selectOne("SELECT COUNT(*) AS c FROM `{$scratch}`.`{$table}`")->c;
                $live = (int) DB::table($table)->count();
                $results[] = ['table' => $table, 'backup' => $backup, 'live' => $live, 'ok' => $backup <= $live && ($live === 0 || $backup > 0)];
            }

            return $results;
        } finally {
            $this->run(['bash', '-c', "{$client} -e ".escapeshellarg("DROP DATABASE IF EXISTS `{$scratch}`")], $db['password']);
        }
    }

    /** @return array{host: string, port: int|string, username: string, password: string, database: string} */
    private function connection(): array
    {
        $config = config('database.connections.'.config('database.default'));
        if (($config['driver'] ?? null) !== 'mysql') {
            throw new RuntimeException('Backups support MySQL only.');
        }

        return ['host' => (string) $config['host'], 'port' => $config['port'], 'username' => (string) $config['username'], 'password' => (string) ($config['password'] ?? ''), 'database' => (string) $config['database']];
    }

    /** @param list<string> $command */
    private function run(array $command, string $password, int $timeout = 600): void
    {
        $process = new Process($command, null, ['MYSQL_PWD' => $password], null, $timeout);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new RuntimeException(trim($process->getErrorOutput()) ?: 'The command failed.');
        }
    }
}
