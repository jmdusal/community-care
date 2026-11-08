<?php

namespace App\Domain\Settings\Listeners;

use App\Domain\Settings\Contracts\SettingsRepository;
use App\Domain\Settings\Events\SettingUpdated;

/**
 * Runs synchronously (not queued): the very next read must see the new value.
 */
final class ClearSettingsCache
{
    public function __construct(private readonly SettingsRepository $settings) {}

    public function handle(SettingUpdated $event): void
    {
        $this->settings->flush();
    }
}
