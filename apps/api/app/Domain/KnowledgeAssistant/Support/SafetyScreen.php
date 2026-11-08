<?php

namespace App\Domain\KnowledgeAssistant\Support;

use App\Domain\KnowledgeAssistant\Enums\AnswerOutcome;

/**
 * Runs before retrieval and before any model call.
 * Emergencies always win; diagnosis and medicine questions are declined.
 * Patterns cover English and Filipino; they favour false positives, because
 * a wrongly shown 911 notice costs far less than a missed one.
 */
final class SafetyScreen
{
    public const EMERGENCY_ANSWER = 'This may be an emergency. Call 911 now or go to the nearest emergency room. '
        .'If someone is not breathing, unconscious, bleeding heavily or may harm themselves, do not wait for an online answer.';

    public const OUT_OF_SCOPE_ANSWER = 'I can\'t diagnose illnesses or recommend medicines or doses. '
        .'Please talk to a doctor, nurse or pharmacist; a health center near you can help. '
        .'If symptoms are severe or getting worse, call 911 or go to the nearest emergency room.';

    /** @var list<string> */
    private const EMERGENCY = [
        'chest pain', 'heart attack', 'atake sa puso', 'inaatake',
        'can\'?t breathe', 'cannot breathe', 'not breathing', 'difficulty breathing', 'hard to breathe', 'hindi makahinga', 'hirap huminga', 'di makahinga',
        'unconscious', 'passed out', 'unresponsive', 'walang malay', 'nawalan ng malay',
        'seizure', 'convulsion', 'kombulsyon', 'nangingisay', 'stroke',
        'bleeding (heavily|a lot|badly)', 'heavy bleeding', 'won\'?t stop bleeding', 'dumudugo nang? (malakas|marami)', 'hindi tumitigil ang dugo',
        'overdose', 'poisoned', 'poisoning', 'nalason', 'uminom ng lason',
        'suicide', 'kill (myself|himself|herself)', 'end my life', 'hurt myself', 'magpakamatay', 'papatayin ko ang sarili',
        'stabbed', 'gunshot', 'been shot', 'sinaksak', 'binaril',
        'accident', 'naaksidente', 'nasagasaan', 'choking', 'nabulunan', 'drowning', 'nalunod',
        'snake ?bite', 'tinuklaw', 'manganganak na', 'water broke', 'pumutok na ang panubigan',
    ];

    /** @var list<string> */
    private const OUT_OF_SCOPE = [
        'do i have', 'diagnos', 'what (illness|disease|sickness|condition) (do|does|is)', 'is it (cancer|dengue|covid|tb)',
        'dosage', 'dose of', 'how (much|many) (mg|ml|tablets?|pills?|capsules?)',
        '(what|which) (medicine|medication|drug|antibiotic|tablet)s? (should|can|to|do)', 'should i take', 'prescri(be|ption) (for|me)',
        'anong gamot', 'ano ang gamot', 'gamot (para|sa) ', 'ilang (tableta|mg)', 'may sakit ba ako', 'ano ang sakit ko',
    ];

    public function screen(string $question): ?AnswerOutcome
    {
        $text = mb_strtolower($question);

        if ($this->matches($text, self::EMERGENCY)) {
            return AnswerOutcome::Emergency;
        }

        if ($this->matches($text, self::OUT_OF_SCOPE)) {
            return AnswerOutcome::OutOfScope;
        }

        return null;
    }

    /** @param list<string> $patterns */
    private function matches(string $text, array $patterns): bool
    {
        return preg_match('/(?<![\p{L}])('.implode('|', $patterns).')/u', $text) === 1;
    }
}
