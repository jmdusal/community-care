<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Settings\Contracts\SettingsRepository;
use App\Domain\Settings\Events\SettingUpdated;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class SettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_unauthenticated(): void
    {
        $this->getJson('/api/v1/admin/settings')->assertUnauthorized();
    }

    public function test_verifiers_cannot_read_or_change_settings(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::Verifier));

        $this->getJson('/api/v1/admin/settings')->assertForbidden()->assertJsonPath('error.code', 'forbidden');
        $this->patchJson('/api/v1/admin/settings', ['settings' => [['key' => 'api.max_page_size', 'value' => 20]]])
            ->assertForbidden();
    }

    public function test_admins_see_every_setting_with_its_default(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));

        $this->getJson('/api/v1/admin/settings')
            ->assertOk()
            ->assertJsonFragment([
                'key' => 'verification.stale_after_days',
                'value' => 180,
                'default' => 180,
                'type' => 'int',
            ]);
    }

    public function test_admin_update_persists_typed_values_and_reports_what_changed(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));

        $this->patchJson('/api/v1/admin/settings', ['settings' => [
            ['key' => 'verification.stale_after_days', 'value' => '150'],
            ['key' => 'features.assistant.enabled', 'value' => true],
            ['key' => 'api.max_page_size', 'value' => 50],
        ]])
            ->assertOk()
            ->assertJsonPath('meta.changed', ['verification.stale_after_days', 'features.assistant.enabled'])
            ->assertJsonFragment(['key' => 'verification.stale_after_days', 'value' => 150]);

        $settings = app(SettingsRepository::class);
        $this->assertSame(150, $settings->int('verification.stale_after_days'));
        $this->assertTrue($settings->bool('features.assistant.enabled'));
    }

    public function test_each_change_raises_one_setting_updated_event(): void
    {
        Event::fake([SettingUpdated::class]);
        Sanctum::actingAs($admin = $this->userWithRole(RoleName::SystemAdmin));

        $this->patchJson('/api/v1/admin/settings', ['settings' => [['key' => 'api.rate_limit.search', 'value' => 90]]])->assertOk();

        Event::assertDispatchedTimes(SettingUpdated::class, 1);
        Event::assertDispatched(SettingUpdated::class, fn (SettingUpdated $event): bool => $event->key === 'api.rate_limit.search'
            && $event->oldValue === 60
            && $event->newValue === 90
            && $event->actorId === $admin->id);
    }

    public function test_changes_are_written_to_the_audit_log(): void
    {
        Sanctum::actingAs($admin = $this->userWithRole(RoleName::SystemAdmin));

        $this->patchJson('/api/v1/admin/settings', ['settings' => [['key' => 'verification.stale_after_days', 'value' => 200]]])->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'settings.updated',
            'resource_type' => 'setting',
            'resource_id' => 'verification.stale_after_days',
        ]);
    }

    public function test_values_are_validated_against_the_settings_schema(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));

        $this->patchJson('/api/v1/admin/settings', ['settings' => [
            ['key' => 'verification.stale_after_days', 'value' => 5],
            ['key' => 'not.a.setting', 'value' => 1],
        ]])
            ->assertUnprocessable()
            ->assertJsonStructure(['error' => ['fields' => ['settings.0.value', 'settings.1.key']]]);

        $this->assertDatabaseCount('settings', 0);
    }
}
