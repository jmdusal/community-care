<?php

namespace Tests\Feature\Api\V1\Booking;

use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use App\Domain\Settings\Contracts\SettingsRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class BookingRulesTest extends TestCase
{
    use RefreshDatabase;

    private Facility $facility;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        app(SettingsRepository::class)->write('features.booking.enabled', true, null);
        app(SettingsRepository::class)->flush();
        $this->facility = Facility::factory()->published()->create(['booking_enabled' => true]);
    }

    public function test_facility_admins_set_their_own_rules_and_null_means_the_default(): void
    {
        $admin = $this->userWithRole(RoleName::FacilityAdmin);
        $this->facility->staff()->attach($admin);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/admin/facilities/{$this->facility->public_id}/booking-rules", ['max_active' => 1, 'cancel_cutoff_hours' => 24, 'min_notice_hours' => null])
            ->assertOk()
            ->assertJsonPath('data.max_active', 1)
            ->assertJsonPath('data.effective.cancel_cutoff_hours', 24)
            ->assertJsonPath('data.min_notice_hours', null)
            ->assertJsonPath('data.effective.min_notice_hours', 1);
        $this->assertDatabaseHas('audit_logs', ['action' => 'facility.booking_rules_changed', 'resource_id' => $this->facility->public_id]);

        $this->getJson("/api/v1/admin/facilities/{$this->facility->public_id}/availability")->assertJsonPath('meta.rules.effective.max_active', 1);
    }

    public function test_staff_cannot_change_the_rules(): void
    {
        $staff = $this->userWithRole(RoleName::FacilityStaff);
        $this->facility->staff()->attach($staff);
        Sanctum::actingAs($staff);

        $this->patchJson("/api/v1/admin/facilities/{$this->facility->public_id}/booking-rules", ['max_active' => 5, 'cancel_cutoff_hours' => null, 'min_notice_hours' => null])->assertForbidden();
    }

    public function test_the_facility_limit_and_notice_apply_to_requests(): void
    {
        $this->facility->update(['booking_max_active' => 1, 'booking_min_notice_hours' => 12]);
        Sanctum::actingAs($this->patient());

        // Inside the 12-hour notice: not offered and refused.
        $soon = $this->slot(6);
        $this->getJson("/api/v1/facilities/{$this->facility->public_id}/availability")->assertJsonMissing(['id' => $soon->public_id]);
        $this->book($soon, 'too-soon-key')->assertConflict();

        $this->book($this->slot(24), 'first-key')->assertCreated();
        $this->book($this->slot(48), 'second-key')->assertConflict()->assertJsonPath('error.message', 'You already have an upcoming appointment request. Cancel one before requesting another.');
    }

    public function test_closed_special_days_block_booking(): void
    {
        $slot = $this->slot(30);
        $this->facility->hourExceptions()->create(['date' => $slot->starts_at->copy()->timezone('Asia/Manila')->toDateString(), 'is_closed' => true, 'reason' => 'Holiday']);
        Sanctum::actingAs($this->patient());

        $this->getJson("/api/v1/facilities/{$this->facility->public_id}/availability")->assertJsonMissing(['id' => $slot->public_id]);
        $this->book($slot, 'holiday-key')->assertConflict();
    }

    private function patient(): User
    {
        return $this->userWithRole(RoleName::Patient, ['mobile' => '+639171234567']);
    }

    private function slot(int $inHours): ClinicAvailability
    {
        return ClinicAvailability::query()->create(['facility_id' => $this->facility->id, 'starts_at' => now()->addHours($inHours), 'ends_at' => now()->addHours($inHours)->addMinutes(30), 'capacity' => 5]);
    }

    private function book(ClinicAvailability $slot, string $key)
    {
        return $this->withHeader('Idempotency-Key', $key)->postJson('/api/v1/appointments', ['slot_id' => $slot->public_id]);
    }
}
