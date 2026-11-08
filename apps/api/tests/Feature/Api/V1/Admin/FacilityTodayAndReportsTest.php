<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use App\Domain\Shared\Notifications\InAppNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class FacilityTodayAndReportsTest extends TestCase
{
    use RefreshDatabase;

    private Facility $facility;

    private User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->facility = Facility::factory()->published()->create(['name' => 'Pilot Health Center']);
        $this->staff = $this->userWithRole(RoleName::FacilityStaff);
        $this->facility->staff()->attach($this->staff);
    }

    public function test_staff_post_today_and_the_public_sees_it_only_today(): void
    {
        Sanctum::actingAs($this->staff);

        $this->putJson("/api/v1/admin/facilities/{$this->facility->public_id}/today", [
            'doctor' => 'in', 'opening' => 'closing_early', 'closes_at' => '15:00',
            'out_of_stock' => ['BCG vaccine', 'Paracetamol syrup'], 'note' => 'Bring your baby book.',
        ])->assertOk()->assertJsonPath('data.doctor', 'in')->assertJsonPath('data.updated_by', $this->staff->name);

        $this->getJson("/api/v1/facilities/{$this->facility->public_id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Pilot Health Center')
            ->assertJsonPath('data.today.opening', 'closing_early')
            ->assertJsonPath('data.today.closes_at', '15:00')
            ->assertJsonPath('data.today.out_of_stock', ['BCG vaccine', 'Paracetamol syrup'])
            ->assertJsonPath('data.today.updated_by', null);
        $this->assertDatabaseHas('audit_logs', ['action' => 'facility.today_updated', 'resource_id' => $this->facility->public_id]);

        $this->travel(1)->days();
        $this->getJson("/api/v1/facilities/{$this->facility->public_id}")->assertJsonPath('data.today', null);
    }

    public function test_closing_early_needs_a_time_and_others_cannot_update(): void
    {
        Sanctum::actingAs($this->staff);
        $this->putJson("/api/v1/admin/facilities/{$this->facility->public_id}/today", ['doctor' => null, 'opening' => 'closing_early', 'out_of_stock' => [], 'note' => null])
            ->assertUnprocessable()->assertJsonValidationErrors(['closes_at'], 'error.fields');

        Sanctum::actingAs($this->userWithRole(RoleName::FacilityStaff));
        $this->putJson("/api/v1/admin/facilities/{$this->facility->public_id}/today", ['doctor' => 'in', 'opening' => null, 'out_of_stock' => [], 'note' => null])->assertForbidden();
    }

    public function test_the_public_reports_wrong_information_and_staff_handle_it(): void
    {
        Notification::fake();

        $this->postJson("/api/v1/facilities/{$this->facility->public_id}/reports", ['reason' => 'other'])->assertUnprocessable();
        $id = $this->postJson("/api/v1/facilities/{$this->facility->public_id}/reports", ['reason' => 'phone_wrong', 'details' => 'The number rings out.', 'contact' => '0917 000 0000'])
            ->assertCreated()->json('data.id');
        Notification::assertSentTo($this->staff, InAppNotification::class);

        Sanctum::actingAs($this->staff);
        $this->getJson('/api/v1/admin/facility-reports')->assertOk()->assertJsonPath('meta.counts.open', 1)->assertJsonPath('data.0.reason.label', 'Phone number does not work');
        $this->postJson("/api/v1/admin/facility-reports/{$id}/resolve", ['note' => 'Updated the phone number.'])->assertOk()->assertJsonPath('data.status', 'resolved');
        $this->postJson("/api/v1/admin/facility-reports/{$id}/dismiss")->assertConflict();
        $this->getJson('/api/v1/admin/facility-reports?status=resolved')->assertJsonPath('data.0.resolved_by', $this->staff->name);

        Sanctum::actingAs($this->userWithRole(RoleName::FacilityStaff));
        $this->getJson('/api/v1/admin/facility-reports')->assertOk()->assertJsonPath('meta.counts.resolved', 0);
    }
}
