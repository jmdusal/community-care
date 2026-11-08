<?php

namespace App\Domain\DataImports\Matching;

use Illuminate\Support\Str;

final class NameNormalizer
{
    /** "Brgy. San Isidro Health Station" and "BRGY SAN ISIDRO HEALTH STATION" compare equal. */
    public static function normalize(string $name): string
    {
        $ascii = Str::lower(Str::ascii($name));
        $ascii = (string) preg_replace('/\bbrgy\b\.?/', 'barangay', $ascii);
        $ascii = (string) preg_replace('/[^a-z0-9]+/', ' ', $ascii);

        return trim($ascii);
    }

    /** Similarity from 0 to 100. */
    public static function similarity(string $normalizedA, string $normalizedB): int
    {
        if ($normalizedA === $normalizedB) {
            return 100;
        }

        similar_text($normalizedA, $normalizedB, $percent);

        return (int) round($percent);
    }
}
