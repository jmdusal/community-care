<?php

namespace App\Domain\DataImports\Support;

use App\Domain\DataImports\Exceptions\ImportFileInvalid;
use SplFileObject;

/**
 * Streams a CSV file as associative rows keyed by its header, without loading
 * it all into memory. Strips a UTF-8 byte-order mark and skips blank lines.
 */
final class CsvReader
{
    /**
     * @return array{header: list<string>, rows: \Generator<int, array<string, string>>}
     */
    public static function open(string $path): array
    {
        if (! is_readable($path)) {
            throw ImportFileInvalid::unreadable(basename($path));
        }

        $file = new SplFileObject($path);
        $file->setFlags(SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY | SplFileObject::READ_AHEAD);

        $header = $file->fgetcsv(escape: '');
        if (! is_array($header) || $header === [null]) {
            throw ImportFileInvalid::unreadable(basename($path));
        }

        $header = array_map(fn ($column): string => trim(preg_replace('/^\xEF\xBB\xBF/', '', (string) $column) ?? ''), $header);

        return ['header' => $header, 'rows' => self::rows($file, $header)];
    }

    /**
     * @param  list<string>  $header
     * @return \Generator<int, array<string, string>>
     */
    private static function rows(SplFileObject $file, array $header): \Generator
    {
        $line = 1;
        while (! $file->eof()) {
            $values = $file->fgetcsv(escape: '');
            $line++;

            if (! is_array($values) || $values === [null] || implode('', array_map('strval', $values)) === '') {
                continue;
            }

            $values = array_pad(array_slice($values, 0, count($header)), count($header), '');

            yield $line => array_combine($header, array_map(fn ($value): string => trim((string) $value), $values));
        }
    }
}
