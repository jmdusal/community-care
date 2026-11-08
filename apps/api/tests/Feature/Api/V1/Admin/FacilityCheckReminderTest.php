<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Notifications\FacilityCheckReminder;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Shared\Notifications\InAppNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

final class FacilityCheckReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_get_one_monthly_reminder_listing_their_facilities_not_checked_recently(): void
    {
        Notification::fake();
        $old = Facility::factory()->published()->create(['name' => 'Old Health Center', 'verified_at' => now()->subDays(60)]);
        $never = Facility::factory()->published()->create(['name' => 'Never Checked Clinic', 'verified_at' => null]);
        $fresh = Facility::factory()->published()->create(['name' => 'Fresh Station', 'verified_at' => now()->subDays(5)]);
        $staff = $this->userWithRole(RoleName::FacilityStaff);
        $other = $this->userWithRole(RoleName::FacilityStaff);
        $staff->facilities()->attach([$old->id, $never->id, $fresh->id]);
        $other->facilities()->attach([$fresh->id]);

        $this->artisan('communitycare:remind-facility-checks')->expectsOutput('Reminded 1 people about 2 facilities.')->assertSuccessful();

        Notification::assertSentTo($staff, FacilityCheckReminder::class, fn (FacilityCheckReminder $n) => collect($n->facilities)->pluck('name')->sort()->values()->all() === ['Never Checked Clinic', 'Old Health Center']);
        Notification::assertSentTo($staff, InAppNotification::class);
        Notification::assertNotSentTo($other, FacilityCheckReminder::class);

        // Running again the same month sends nothing new.
        $this->artisan('communitycare:remind-facility-checks')->expectsOutput('Reminded 0 people about 0 facilities.')->assertSuccessful();
    }
}
