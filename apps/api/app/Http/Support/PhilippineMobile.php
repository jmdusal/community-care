<?php

namespace App\Http\Support;

/** Philippine mobile numbers in one shape: 0917 123 4567, 63917…, +63 917… all become +639171234567. */
final class PhilippineMobile
{
    public const RULE = 'regex:/^\+639\d{9}$/';

    public const MESSAGE = 'Enter a Philippine mobile number, for example 0917 123 4567.';

    public static function normalize(mixed $value): mixed
    {
        if (! is_string($value) || trim($value) === '') {
            return $value === '' ? null : $value;
        }

        $digits = preg_replace('/[\s\-()]/', '', $value);

        return preg_match('/^(\+?63|0)?(9\d{9})$/', (string) $digits, $m) === 1 ? '+63'.$m[2] : $digits;
    }
}
