<?php

namespace Tests\Feature\Api\V1\Booking;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class HealthProgramTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $facilityIds, array $overrides = []): array
    {
        return [
            'title' => 'Measles catch-up vaccination', 'category' => 'immunization',
            'summary' => 'Free measles vaccine for children under five.', 'description' => 'Bring the child\'s vaccination card.',
            'starts_on' => now()->toDateString(), 'ends_on' => now()->addMonth()->toDateString(),
            'source_name' => 'DOH', 'source_url' => 'https://doh.gov.ph', 'facility_ids' => $facilityIds, ...$overrides,
        ];
    }

    public function test_verifier_creates_and_publishes_a_program_that_the_public_then_sees(): void
    {
        $published = Facility::factory()->published()->create(['name' => 'Open Center']);
        $hidden = Facility::factory()->create(['name' => 'Unpublished Center']);
        Sanctum::actingAs($this->userWithRole(RoleName::Verifier));

        $id = $this->postJson('/api/v1/admin/health-programs', $this->payload([$published->public_id, $hidden->public_id]))
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonCount(2, 'data.facilities')
            ->json('data.id');

        $this->getJson('/api/v1/health-programs')->assertOk()->assertJsonPath('meta.total', 0);
        $this->getJson("/api/v1/health-programs/{$id}")->assertNotFound();

        $this->postJson("/api/v1/admin/health-programs/{$id}/publish")->assertOk()->assertJsonPath('data.status', 'published');

        $this->getJson('/api/v1/health-programs')->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.facility_count', 1);
        $this->getJson("/api/v1/health-programs/{$id}")
            ->assertOk()
            ->assertJsonCount(1, 'data.facilities')
            ->assertJsonPath('data.facilities.0.name', 'Open Center')
            ->assertJsonMissingPath('data.status');
        $this->getJson("/api/v1/facilities/{$published->public_id}")->assertJsonPath('data.programs.0.title', 'Measles catch-up vaccination');

        $this->assertDatabaseHas('audit_logs', ['action' => 'health_program.published', 'resource_id' => $id]);
    }

    public function test_ended_programs_and_programs_without_facilities_cannot_be_published(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));

        $empty = $this->postJson('/api/v1/admin/health-programs', $this->payload([]))->json('data.id');
        $this->postJson("/api/v1/admin/health-programs/{$empty}/publish")->assertConflict();

        $ended = $this->postJson('/api/v1/admin/health-programs', $this->payload([Facility::factory()->published()->create()->public_id], [
            'starts_on' => now()->subMonths(2)->toDateString(), 'ends_on' => now()->subMonth()->toDateString(),
        ]))->json('data.id');
        $this->postJson("/api/v1/admin/health-programs/{$ended}/publish")->assertConflict();
    }

    public function test_facility_staff_cannot_manage_programs(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::FacilityStaff));

        $this->getJson('/api/v1/admin/health-programs')->assertForbidden();
        $this->postJson('/api/v1/admin/health-programs', $this->payload([]))->assertForbidden();
    }

    public function test_tab_counts_follow_the_selected_facility(): void
    {
        $inProgram = Facility::factory()->published()->create();
        $elsewhere = Facility::factory()->published()->create();
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));
        $this->postJson('/api/v1/admin/health-programs', $this->payload([$inProgram->public_id]))->assertCreated();

        $this->getJson('/api/v1/admin/health-programs?facility_id='.$elsewhere->public_id)
            ->assertOk()
            ->assertJsonPath('meta.total', 0)
            ->assertJsonPath('meta.status_counts', []);

        $this->getJson('/api/v1/admin/health-programs?facility_id='.$inProgram->public_id)
            ->assertOk()
            ->assertJsonPath('meta.status_counts.draft', 1);
    }
}
