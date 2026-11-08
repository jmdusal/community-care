<?php

namespace App\Http\Support;

use DateTimeInterface;
use Illuminate\Support\Carbon;

/** Formats stored UTC timestamps in the display timezone (Asia/Manila by default). */
final class Time
{
    public static function iso(?DateTimeInterface $time): ?string
    {
        return $time === null
            ? null
            : Carbon::instance($time)->setTimezone(config('communitycare.display_timezone'))->toIso8601String();
    }
}
