<?php

namespace App\Domain\Audit\Support;

/**
 * Keeps enough of an IP address to spot patterns, never the full address.
 * IPv4 keeps the first two octets; IPv6 keeps the first three groups.
 */
final class IpMasker
{
    public static function mask(?string $ip): ?string
    {
        if ($ip === null || $ip === '') {
            return null;
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            [$a, $b] = explode('.', $ip);

            return "{$a}.{$b}.x.x";
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            $groups = explode(':', $ip);

            return implode(':', array_slice($groups, 0, 3)).'::';
        }

        return null;
    }
}
