<?php

namespace App\Domain\KnowledgeAssistant\Enums;

enum AnswerOutcome: string
{
    /** Answered from approved records, with citations. */
    case Answered = 'answered';

    /** Nothing approved matched; the user is pointed to the facility or an official source. */
    case NoInformation = 'no_information';

    /** Possible emergency: the 911 answer, before any retrieval or model call. */
    case Emergency = 'emergency';

    /** Diagnosis, medicine or dosage questions the assistant must not answer. */
    case OutOfScope = 'out_of_scope';
}
