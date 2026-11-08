<?php

namespace App\Domain\KnowledgeAssistant\Support;

/** Turns a free-text question into search words (English and Filipino stopwords removed). */
final class Keywords
{
    private const MIN_LENGTH = 3;

    /** @var list<string> */
    private const STOPWORDS = [
        'the', 'and', 'for', 'are', 'is', 'was', 'where', 'what', 'when', 'which', 'who', 'how', 'can', 'could', 'would', 'should',
        'you', 'your', 'our', 'their', 'there', 'here', 'this', 'that', 'with', 'from', 'into', 'any', 'does', 'did', 'have', 'has',
        'please', 'near', 'nearest', 'nearby', 'open', 'get', 'find', 'need', 'want', 'know', 'tell', 'about', 'some', 'today',
        'tomorrow', 'now', 'available', 'facility', 'facilities', 'clinic', 'clinics', 'place', 'places', 'free', 'also', 'around',
        'saan', 'ang', 'mga', 'may', 'meron', 'mayroon', 'ako', 'kami', 'tayo', 'kayo', 'sila', 'para', 'kailan', 'paano', 'anong',
        'ano', 'nasaan', 'malapit', 'pwede', 'puwede', 'gusto', 'kailangan', 'yung', 'iyong', 'dito', 'diyan', 'doon', 'lang', 'naman',
        'po', 'ba', 'ng', 'sa', 'na', 'ko', 'mo', 'ni', 'kay', 'at',
    ];

    /** @return list<string> */
    public static function from(string $text): array
    {
        $words = preg_split('/[^\p{L}\p{N}\-]+/u', mb_strtolower($text)) ?: [];

        $words = array_filter($words, fn (string $word): bool => mb_strlen(trim($word, '-')) >= self::MIN_LENGTH && ! in_array($word, self::STOPWORDS, true));

        return array_values(array_unique(array_map(fn (string $word): string => trim($word, '-'), $words)));
    }
}
