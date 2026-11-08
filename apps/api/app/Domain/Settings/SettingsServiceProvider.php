<?php

namespace App\Domain\Settings;

use App\Domain\Settings\Contracts\SettingsRepository;
use App\Domain\Settings\Events\SettingUpdated;
use App\Domain\Settings\Listeners\ClearSettingsCache;
use App\Domain\Settings\Repositories\CachedSettingsRepository;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

final class SettingsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(SettingsSchema::class);
        $this->app->singleton(SettingsRepository::class, CachedSettingsRepository::class);
    }

    public function boot(): void
    {
        Event::listen(SettingUpdated::class, ClearSettingsCache::class);
    }
}
