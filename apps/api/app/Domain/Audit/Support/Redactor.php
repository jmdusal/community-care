<?php

namespace App\Domain\Audit\Support;

/**
 * Removes secrets and personal contact details before anything is written
 * to the audit log. Facility addresses are public data and are kept.
 */
final class Redactor
{
    private const PATTERN = '/(password|token|secret|api_key|phone|mobile|email|contact_value)/i';

    public const MASK = '[redacted]';

    /**
     * @param  array<string|int, mixed>  $data
     * @return array<string|int, mixed>
     */
    public function redact(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_string($key) && preg_match(self::PATTERN, $key) === 1) {
                $data[$key] = self::MASK;
            } elseif (is_array($value)) {
                $data[$key] = $this->redact($value);
            }
        }

        return $data;
    }
}
