<?php

namespace App\Domain\Booking\Support;

use App\Domain\Booking\Models\Appointment;

/** Short codes people can read over the phone: CC-7KQ2-9MXD (no 0/O, 1/I). */
final class ReferenceCode
{
    private const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

    public static function generate(): string
    {
        do {
            $code = 'CC-'.self::part().'-'.self::part();
        } while (Appointment::query()->where('reference_code', $code)->exists());

        return $code;
    }

    private static function part(): string
    {
        $part = '';
        for ($i = 0; $i < 4; $i++) {
            $part .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
        }

        return $part;
    }
}
