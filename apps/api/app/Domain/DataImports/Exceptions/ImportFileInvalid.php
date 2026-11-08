<?php

namespace App\Domain\DataImports\Exceptions;

use RuntimeException;

final class ImportFileInvalid extends RuntimeException
{
    /** @param list<string> $columns */
    public static function missingColumns(array $columns): self
    {
        return new self('Required column(s) missing from the file: '.implode(', ', $columns).'. Check the column mapping in config/communitycare.php.');
    }

    public static function unreadable(string $path): self
    {
        return new self("The import file could not be read ({$path}).");
    }

    public static function empty(): self
    {
        return new self('The file has a header row but no data rows.');
    }
}
