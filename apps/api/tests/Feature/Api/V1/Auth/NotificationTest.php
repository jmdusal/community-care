<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Settings\Contracts\SettingsRepository;
use App\Domain\Shared\Notifications\InAppNotification;
use Illuminate\Broadcasting\BroadcastManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_get_an_in_app_notification_for_a_new_request_and_can_mark_it_read(): void
    {
        app(SettingsRepository::class)->write('features.booking.enabled', true, null);
        app(SettingsRepository::class)->flush();
        $facility = Facility::factory()->published()->create(['name' => 'Pilot Center', 'booking_enabled' => true]);
        $staff = $this->userWithRole(RoleName::FacilityStaff);
        $facility->staff()->attach($staff);
        $slot = ClinicAvailability::query()->create(['facility_id' => $facility->id, 'starts_at' => now()->addDay(), 'ends_at' => now()->addDay()->addMinutes(30), 'capacity' => 2]);

        Sanctum::actingAs($this->userWithRole(RoleName::Patient, ['name' => 'Private Patient Name']));
        $this->withHeader('Idempotency-Key', 'notify-test-key')->postJson('/api/v1/appointments', ['slot_id' => $slot->public_id])->assertCreated();

        Sanctum::actingAs($staff);
        $list = $this->getJson('/api/v1/me/notifications')
            ->assertOk()
            ->assertJsonPath('meta.unread', 1)
            ->assertJsonPath('data.0.title', 'New appointment request')
            ->assertJsonPath('data.0.path', '/admin/appointments');
        $this->assertStringNotContainsString('Private Patient Name', $list->getContent());

        $this->postJson('/api/v1/me/notifications/'.$list->json('data.0.id').'/read')->assertOk()->assertJsonPath('meta.unread', 0);
    }

    public function test_users_only_see_and_mark_their_own_notifications(): void
    {
        $owner = $this->userWithRole(RoleName::Verifier);
        $owner->notify(new InAppNotification('system', 'Hello', 'Only for the owner', '/admin'));
        $id = $owner->notifications()->value('id');

        Sanctum::actingAs($this->userWithRole(RoleName::Verifier));
        $this->getJson('/api/v1/me/notifications')->assertOk()->assertJsonPath('meta.unread', 0)->assertJsonCount(0, 'data');
        $this->postJson("/api/v1/me/notifications/{$id}/read")->assertNotFound();

        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/me/notifications/read-all')->assertOk();
        $this->assertSame(0, $owner->unreadNotifications()->count());
    }

    public function test_the_private_channel_is_only_authorised_for_its_owner(): void
    {
        // Tests run with broadcasting off; use the real Reverb driver (no server needed to sign
        // channel access) and register the channel rules on it.
        config(['broadcasting.default' => 'reverb']);
        app(BroadcastManager::class)->forgetDrivers();
        require base_path('routes/channels.php');

        $owner = $this->userWithRole(RoleName::Verifier);
        $other = $this->userWithRole(RoleName::Verifier);

        Sanctum::actingAs($owner);
        $this->postJson('/api/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => "private-users.{$owner->public_id}"])->assertOk();
        $this->postJson('/api/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => "private-users.{$other->public_id}"])->assertForbidden();
    }
}
