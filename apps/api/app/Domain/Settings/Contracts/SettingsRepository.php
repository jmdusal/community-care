<?php

namespace App\Domain\Settings\Contracts;

interface SettingsRepository
{
    /** The typed value, or the schema default when nothing is stored. */
    public function get(string $key): int|float|bool|string;

    public function int(string $key): int;

    public function float(string $key): float;

    public function bool(string $key): bool;

    public function string(string $key): string;

    /** @return array<string, int|float|bool|string> every known setting with its current value */
    public function all(): array;

    /** Persist a value. Callers (Actions) own the transaction and the SettingUpdated event. */
    public function write(string $key, int|float|bool|string $value, ?int $actorId): void;

    /** Drop cached values so the next read comes from the database. */
    public function flush(): void;
}
