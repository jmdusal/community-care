<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityType;
use App\Domain\Facilities\Notifications\ChangeRequestNotification;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use App\Domain\Services\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class ChangeRequestWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private Facility $facility;

    private User $staff;

    private User $verifier;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();

        FacilityType::query()->create(['slug' => 'clinic', 'name' => 'Clinic']);
        Service::query()->create(['slug' => 'dental', 'name' => 'Dental', 'category' => 'dental']);

        $this->facility = Facility::factory()->published()->create(['name' => 'Old Name Clinic', 'address' => 'Old Street']);
        $this->staff = $this->userWithRole(RoleName::FacilityStaff);
        $this->staff->facilities()->attach($this->facility->id);
        $this->verifier = $this->userWithRole(RoleName::Verifier);
        $this->admin = $this->userWithRole(RoleName::SystemAdmin);
    }

    public function test_assigned_staff_propose_changes_without_changing_the_record(): void
    {
        Sanctum::actingAs($this->staff);

        $this->patchJson("/api/v1/admin/facilities/{$this->facility->public_id}", ['name' => 'New Name Clinic', 'address' => 'Old Street', 'note' => 'Renamed in 2026'])
            ->assertAccepted()
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('data.changes.name', ['before' => 'Old Name Clinic', 'after' => 'New Name Clinic'])
            ->assertJsonMissingPath('data.changes.address');

        $this->assertSame('Old Name Clinic', $this->facility->refresh()->name);
        $this->assertDatabaseHas('audit_logs', ['action' => 'facility.change_submitted', 'resource_id' => $this->facility->public_id]);
        Notification::assertSentTo([$this->verifier, $this->admin], ChangeRequestNotification::class);
        Notification::assertNotSentTo($this->staff, ChangeRequestNotification::class);
    }

    public function test_unassigned_staff_cannot_see_or_propose(): void
    {
        $other = Facility::factory()->published()->create();
        Sanctum::actingAs($this->staff);

        $this->getJson("/api/v1/admin/facilities/{$other->public_id}")->assertForbidden();
        $this->patchJson("/api/v1/admin/facilities/{$other->public_id}", ['name' => 'Nope'])->assertForbidden();
        $this->getJson('/api/v1/admin/facilities')->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_a_proposal_with_no_differences_is_refused(): void
    {
        Sanctum::actingAs($this->staff);

        $this->patchJson("/api/v1/admin/facilities/{$this->facility->public_id}", ['name' => 'Old Name Clinic'])
            ->assertUnprocessable()
            ->assertJsonStructure(['error' => ['fields' => ['changes']]]);
    }

    public function test_four_eyes_the_submitter_cannot_approve_and_a_different_reviewer_applies_it(): void
    {
        Sanctum::actingAs($this->verifier);
        $id = $this->patchJson("/api/v1/admin/facilities/{$this->facility->public_id}", [
            'name' => 'Renamed Clinic',
            'type' => 'clinic',
            'latitude' => 14.6,
            'longitude' => 121.0,
            'contacts' => [['type' => 'phone', 'value' => '(02) 1234 5678']],
            'hours' => [['day_of_week' => 1, 'opens_at' => '08:00', 'closes_at' => '17:00']],
            'services' => ['dental'],
        ])->assertAccepted()->json('data.id');

        $this->postJson("/api/v1/admin/change-requests/{$id}/approve")
            ->assertConflict()
            ->assertJsonPath('error.message', 'You submitted this change, so another reviewer must approve it (four-eyes review).');

        Sanctum::actingAs($this->admin);
        $this->postJson("/api/v1/admin/change-requests/{$id}/approve")->assertOk()->assertJsonPath('data.status', 'approved');

        $facility = $this->facility->refresh()->load(['type', 'contacts', 'hours', 'services']);
        $this->assertSame('Renamed Clinic', $facility->name);
        $this->assertSame('clinic', $facility->type->slug);
        $this->assertSame(VerificationStatus::Verified, $facility->verification_status);
        $this->assertSame('review', $facility->verification_method);
        $this->assertSame($this->admin->id, $facility->verified_by);
        $this->assertSame('(02) 1234 5678', $facility->contacts->first()->value);
        $this->assertSame('08:00:00', $facility->hours->first()->opens_at);
        $this->assertSame(['dental'], $facility->services->pluck('slug')->all());
        $this->assertDatabaseHas('facility_locations', ['facility_id' => $facility->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'facility.approved', 'actor_id' => $this->admin->id]);
        Notification::assertSentTo($this->verifier, ChangeRequestNotification::class, fn (ChangeRequestNotification $n) => str_contains($n->subjectLine, 'approved'));
    }

    public function test_a_request_is_refused_if_the_record_changed_after_it_was_made(): void
    {
        Sanctum::actingAs($this->staff);
        $first = $this->patchJson("/api/v1/admin/facilities/{$this->facility->public_id}", ['name' => 'Name A'])->json('data.id');
        $second = $this->patchJson("/api/v1/admin/facilities/{$this->facility->public_id}", ['name' => 'Name B'])->json('data.id');

        Sanctum::actingAs($this->verifier);
        $this->postJson("/api/v1/admin/change-requests/{$first}/approve")->assertOk();
        $this->postJson("/api/v1/admin/change-requests/{$second}/approve")
            ->assertConflict()
            ->assertJsonPath('error.code', 'conflict');

        $this->assertSame('Name A', $this->facility->refresh()->name);
    }

    public function test_rejection_needs_a_reason_and_staff_cannot_review(): void
    {
        Sanctum::actingAs($this->staff);
        $id = $this->patchJson("/api/v1/admin/facilities/{$this->facility->public_id}", ['name' => 'Wrong'])->json('data.id');
        $this->postJson("/api/v1/admin/change-requests/{$id}/approve")->assertForbidden();

        Sanctum::actingAs($this->verifier);
        $this->postJson("/api/v1/admin/change-requests/{$id}/reject")->assertUnprocessable();
        $this->postJson("/api/v1/admin/change-requests/{$id}/reject", ['reason' => 'No evidence'])->assertOk()->assertJsonPath('data.reason', 'No evidence');
        $this->postJson("/api/v1/admin/change-requests/{$id}/approve")->assertConflict();
    }

    public function test_only_the_submitter_can_withdraw(): void
    {
        Sanctum::actingAs($this->staff);
        $id = $this->patchJson("/api/v1/admin/facilities/{$this->facility->public_id}", ['name' => 'Oops'])->json('data.id');

        Sanctum::actingAs($this->verifier);
        $this->postJson("/api/v1/admin/change-requests/{$id}/withdraw")->assertForbidden();

        Sanctum::actingAs($this->staff);
        $this->postJson("/api/v1/admin/change-requests/{$id}/withdraw")->assertOk()->assertJsonPath('data.status', 'withdrawn');
    }

    public function test_new_facilities_are_drafts_until_a_second_person_approves(): void
    {
        Sanctum::actingAs($this->staff);
        $this->postJson('/api/v1/admin/facilities', ['name' => 'Staff Clinic'])->assertForbidden();

        Sanctum::actingAs($this->verifier);
        $response = $this->postJson('/api/v1/admin/facilities', ['name' => 'Brand New Clinic', 'type' => 'clinic'])->assertCreated();
        $facilityId = $response->json('data.facility.id');
        $this->assertSame('create', $response->json('data.origin'));

        $this->getJson("/api/v1/facilities/{$facilityId}")->assertNotFound();

        Sanctum::actingAs($this->admin);
        $this->postJson('/api/v1/admin/change-requests/'.$response->json('data.id').'/approve')->assertOk();

        $this->getJson("/api/v1/facilities/{$facilityId}")->assertOk()->assertJsonPath('data.type.slug', 'clinic');
    }

    public function test_the_review_queue_lists_pending_requests_with_counts(): void
    {
        Sanctum::actingAs($this->staff);
        $this->patchJson("/api/v1/admin/facilities/{$this->facility->public_id}", ['name' => 'Queue Me']);

        Sanctum::actingAs($this->verifier);
        $this->getJson('/api/v1/admin/change-requests')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.queue.pending_changes', 1)
            ->assertJsonPath('data.0.facility.name', 'Old Name Clinic')
            ->assertJsonPath('data.0.is_own', false);
    }

    public function test_verifiers_can_reverify_and_withdraw_a_record(): void
    {
        $this->facility->update(['verification_status' => VerificationStatus::Stale]);
        Sanctum::actingAs($this->verifier);

        $this->postJson("/api/v1/admin/facilities/{$this->facility->public_id}/reverify", ['method' => 'phone_call'])
            ->assertOk()
            ->assertJsonPath('data.verification_status', 'verified')
            ->assertJsonPath('data.verification_method', 'phone_call');

        $this->postJson("/api/v1/admin/facilities/{$this->facility->public_id}/publication", ['status' => 'withdrawn', 'reason' => 'Facility closed'])
            ->assertOk()
            ->assertJsonPath('data.publication_status', 'withdrawn');

        $this->getJson("/api/v1/facilities/{$this->facility->public_id}")->assertNotFound();
        $this->assertSame(PublicationStatus::Withdrawn, $this->facility->refresh()->publication_status);

        Sanctum::actingAs($this->staff);
        $this->postJson("/api/v1/admin/facilities/{$this->facility->public_id}/reverify", ['method' => 'phone_call'])->assertForbidden();
    }
}
