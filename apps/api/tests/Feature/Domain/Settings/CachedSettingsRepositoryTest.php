<?php

namespace Tests\Feature\Domain\Settings;

use App\Domain\Settings\Contracts\SettingsRepository;
use App\Domain\Settings\Exceptions\UnknownSetting;
use App\Domain\Settings\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CachedSettingsRepositoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_missing_rows_fall_back_to_schema_defaults(): void
    {
        $settings = app(SettingsRepository::class);

        $this->assertSame(180, $settings->int('verification.stale_after_days'));
        $this->assertSame(1.0, $settings->float('imports.coordinate_conflict_km'));
        $this->assertFalse($settings->bool('features.assistant.enabled'));
    }

    public function test_stored_values_are_returned_with_their_declared_type(): void
    {
        Setting::query()->create(['key' => 'api.max_page_size', 'value' => '40']);

        $this->assertSame(40, app(SettingsRepository::class)->get('api.max_page_size'));
    }

    public function test_reads_are_cached_until_flushed(): void
    {
        $settings = app(SettingsRepository::class);
        $this->assertSame(50, $settings->int('api.max_page_size'));

        Setting::query()->create(['key' => 'api.max_page_size', 'value' => 30]);
        $this->assertSame(50, $settings->int('api.max_page_size'));

        $settings->flush();
        $this->assertSame(30, $settings->int('api.max_page_size'));
    }

    public function test_unknown_keys_are_refused(): void
    {
        $this->expectException(UnknownSetting::class);

        app(SettingsRepository::class)->get('nope.not_real');
    }
}
