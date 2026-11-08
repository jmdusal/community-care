<?php

namespace App\Domain\DataImports\Data;

use App\Domain\DataImports\Enums\ImportFlag;
use App\Domain\DataImports\Enums\MatchStatus;

final readonly class MatchResult
{
    /**
     * @param  list<array{code: string, label: string, detail: string|null}>  $flags
     * @param  list<array{facility_id: int, score: int, reason: string}>  $duplicates
     */
    public function __construct(
        public FacilityRecordData $record,
        public MatchStatus $status,
        public ?int $matchedFacilityId,
        public array $flags,
        public array $duplicates,
    ) {}

    public function isFlagged(): bool
    {
        foreach ($this->flags as $flag) {
            if (ImportFlag::from($flag['code'])->blocksPublishing()) {
                return true;
            }
        }

        return false;
    }

    public function has(ImportFlag $flag): bool
    {
        return in_array($flag->value, array_column($this->flags, 'code'), true);
    }
}
