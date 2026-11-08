<?php

namespace App\Domain\Settings\Repositories;

use App\Domain\Settings\Contracts\SettingsRepository;
use App\Domain\Settings\Models\Setting;
use App\Domain\Settings\SettingsSchema;
use Illuminate\Contracts\Cache\Repository as Cache;

final class CachedSettingsRepository implements SettingsRepository
{
    private const CACHE_KEY = 'communitycare.settings';

    public function __construct(
        private readonly Cache $cache,
        private readonly SettingsSchema $schema,
    ) {}

    public function get(string $key): int|float|bool|string
    {
        $definition = $this->schema->definition($key);
        $stored = $this->stored();

        return array_key_exists($key, $stored)
            ? $this->schema->coerce($key, $stored[$key])
            : $definition['default'];
    }

    public function int(string $key): int
    {
        return (int) $this->get($key);
    }

    public function float(string $key): float
    {
        return (float) $this->get($key);
    }

    public function bool(string $key): bool
    {
        return (bool) $this->get($key);
    }

    public function string(string $key): string
    {
        return (string) $this->get($key);
    }

    public function all(): array
    {
        $values = [];
        foreach ($this->schema->keys() as $key) {
            $values[$key] = $this->get($key);
        }

        return $values;
    }

    public function write(string $key, int|float|bool|string $value, ?int $actorId): void
    {
        $this->schema->definition($key);

        Setting::query()->updateOrCreate(['key' => $key], ['value' => $value, 'updated_by' => $actorId]);
    }

    public function flush(): void
    {
        $this->cache->forget(self::CACHE_KEY);
    }

    /** @return array<string, mixed> */
    private function stored(): array
    {
        return $this->cache->rememberForever(
            self::CACHE_KEY,
            fn () => Setting::query()->pluck('value', 'key')->all(),
        );
    }
}
