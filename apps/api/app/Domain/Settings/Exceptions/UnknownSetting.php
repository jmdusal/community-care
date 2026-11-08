<?php

namespace App\Domain\Settings\Exceptions;

use InvalidArgumentException;

final class UnknownSetting extends InvalidArgumentException
{
    public static function named(string $key): self
    {
        return new self("Unknown setting [{$key}]. Add it to SettingsSchema first.");
    }
}
