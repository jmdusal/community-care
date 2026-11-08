<?php

namespace App\Domain\Settings;

use App\Domain\Settings\Exceptions\UnknownSetting;

/**
 * The single source of truth for every runtime setting: its type, default,
 * validation rules and description. Adding a setting = adding an entry here.
 */
final class SettingsSchema
{
    public const INT = 'int';

    public const FLOAT = 'float';

    public const BOOL = 'bool';

    public const STRING = 'string';

    /**
     * @return array<string, array{type: string, default: int|float|bool|string, rules: list<string>, description: string}>
     */
    public function definitions(): array
    {
        return [
            'verification.check_reminder_days' => [
                'type' => self::INT, 'default' => 30, 'rules' => ['integer', 'min:7', 'max:365'],
                'description' => 'Monthly reminder: facility staff are asked to check facilities not verified for this many days.',
            ],
            'verification.stale_after_days' => [
                'type' => self::INT, 'default' => 180, 'rules' => ['integer', 'min:30', 'max:365'],
                'description' => 'Days after verification before a record is marked stale.',
            ],
            'imports.coordinate_conflict_km' => [
                'type' => self::FLOAT, 'default' => 1.0, 'rules' => ['numeric', 'min:0.1', 'max:50'],
                'description' => 'Distance between imported and existing coordinates that raises a conflict flag.',
            ],
            'imports.duplicate_name_similarity' => [
                'type' => self::INT, 'default' => 85, 'rules' => ['integer', 'min:50', 'max:100'],
                'description' => 'Name similarity (0-100) in the same city that proposes an imported record as a duplicate.',
            ],
            'api.rate_limit.search' => [
                'type' => self::INT, 'default' => 60, 'rules' => ['integer', 'min:10', 'max:600'],
                'description' => 'Public facility search requests per minute per IP.',
            ],
            'api.rate_limit.login' => [
                'type' => self::INT, 'default' => 5, 'rules' => ['integer', 'min:3', 'max:30'],
                'description' => 'Login attempts per minute per email and IP.',
            ],
            'api.rate_limit.assistant' => [
                'type' => self::INT, 'default' => 10, 'rules' => ['integer', 'min:1', 'max:120'],
                'description' => 'AI assistant messages per minute per IP.',
            ],
            'api.max_page_size' => [
                'type' => self::INT, 'default' => 50, 'rules' => ['integer', 'min:10', 'max:100'],
                'description' => 'Maximum per_page on list endpoints.',
            ],
            'api.nearby_radius_cap_km' => [
                'type' => self::INT, 'default' => 50, 'rules' => ['integer', 'min:1', 'max:200'],
                'description' => 'Maximum radius_km for nearby search.',
            ],
            'features.assistant.enabled' => [
                'type' => self::BOOL, 'default' => false, 'rules' => ['boolean'],
                'description' => 'Turns on the public AI assistant',
            ],
            'features.booking.enabled' => [
                'type' => self::BOOL, 'default' => false, 'rules' => ['boolean'],
                'description' => 'Turns on appointment requests. Facilities must also be opted in.',
            ],
            'booking.max_active_per_patient' => [
                'type' => self::INT, 'default' => 3, 'rules' => ['integer', 'min:1', 'max:10'],
                'description' => 'Upcoming requested or confirmed appointments one patient may hold.',
            ],
            'booking.cancel_cutoff_hours' => [
                'type' => self::INT, 'default' => 2, 'rules' => ['integer', 'min:0', 'max:72'],
                'description' => 'Patients can cancel online until this many hours before the appointment.',
            ],
            'booking.min_notice_hours' => [
                'type' => self::INT, 'default' => 1, 'rules' => ['integer', 'min:0', 'max:168'],
                'description' => 'Requests must be made at least this many hours before the appointment time.',
            ],
            'security.require_mfa_for_staff' => [
                'type' => self::BOOL, 'default' => true, 'rules' => ['boolean'],
                'description' => 'Require two-factor authentication for verifiers and administrators.',
            ],
        ];
    }

    /** @return list<string> */
    public function keys(): array
    {
        return array_keys($this->definitions());
    }

    public function has(string $key): bool
    {
        return array_key_exists($key, $this->definitions());
    }

    /**
     * @return array{type: string, default: int|float|bool|string, rules: list<string>, description: string}
     */
    public function definition(string $key): array
    {
        return $this->definitions()[$key] ?? throw UnknownSetting::named($key);
    }

    /** Convert an already-validated input or stored value to the setting's type. */
    public function coerce(string $key, mixed $value): int|float|bool|string
    {
        return match ($this->definition($key)['type']) {
            self::INT => (int) $value,
            self::FLOAT => (float) $value,
            self::BOOL => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            default => (string) $value,
        };
    }
}
