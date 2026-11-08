<?php

namespace App\Http\Support;

/**
 * The top-bar scope sent by the admin console: `facility_id` is one facility's public id,
 * or several separated by commas (up to 20); `region_code` is a PSGC region. Access is
 * still checked by each endpoint (assigned facilities only, for assigned-facility roles).
 */
final class ConsoleScope
{
    /** Validation rule for `facility_id`. */
    public const FACILITY_RULE = ['nullable', 'string', 'max:600', 'regex:/^[0-9A-Za-z]{26}(,[0-9A-Za-z]{26}){0,19}$/'];

    /** @return list<string>|null public ids, or null when no facility was chosen */
    public static function facilityIds(?string $value): ?array
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return array_values(array_unique(array_filter(array_map('trim', explode(',', $value)))));
    }
}
