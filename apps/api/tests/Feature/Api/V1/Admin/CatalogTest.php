<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityType;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Services\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class CatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_system_admins_add_rename_archive_and_restore_services(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));

        $this->postJson('/api/v1/admin/catalog/services', ['name' => 'Mental health', 'category' => 'mental_health'])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'mental-health')
            ->assertJsonPath('data.facilities', 0);
        $this->postJson('/api/v1/admin/catalog/services', ['name' => 'Mental health', 'category' => 'general'])->assertUnprocessable();

        // Renaming keeps the slug that facility records and search links use.
        $this->patchJson('/api/v1/admin/catalog/services/mental-health', ['name' => 'Mental health care'])
            ->assertOk()
            ->assertJsonPath('data.slug', 'mental-health')
            ->assertJsonPath('data.name', 'Mental health care');

        $this->postJson('/api/v1/admin/catalog/services/mental-health/archive')->assertOk()->assertJsonPath('data.archived', true);
        $this->getJson('/api/v1/services')->assertOk()->assertJsonMissing(['slug' => 'mental-health']);
        $this->getJson('/api/v1/services?with_archived=1')->assertJsonFragment(['slug' => 'mental-health', 'archived' => true]);
        $this->getJson('/api/v1/admin/catalog/services?status=archived')->assertJsonPath('meta.counts.archived', 1)->assertJsonCount(1, 'data');

        $this->postJson('/api/v1/admin/catalog/services/mental-health/restore')->assertOk()->assertJsonPath('data.archived', false);
        $this->assertDatabaseHas('audit_logs', ['action' => 'service.created', 'resource_id' => 'mental-health']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'service.archived', 'resource_id' => 'mental-health']);
    }

    public function test_a_service_in_use_cannot_be_deleted_but_an_unused_one_can(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));
        $used = Service::query()->create(['slug' => 'dental', 'name' => 'Dental', 'category' => 'dental']);
        Service::query()->create(['slug' => 'unused', 'name' => 'Unused', 'category' => 'general']);
        Facility::factory()->published()->create()->services()->attach($used);

        $this->deleteJson('/api/v1/admin/catalog/services/dental')->assertConflict()->assertJsonPath('error.message', 'This service is used by 1 facility. Archive it instead.');
        $this->deleteJson('/api/v1/admin/catalog/services/unused')->assertNoContent();
        $this->assertDatabaseMissing('services', ['slug' => 'unused']);
    }

    public function test_facility_types_have_the_same_management(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));

        $this->postJson('/api/v1/admin/catalog/facility-types', ['name' => 'Birthing home'])->assertCreated()->assertJsonPath('data.slug', 'birthing-home');
        $this->postJson('/api/v1/admin/catalog/facility-types/birthing-home/archive')->assertOk();
        $this->assertNotNull(FacilityType::query()->where('slug', 'birthing-home')->value('archived_at'));
        $this->getJson('/api/v1/facility-types')->assertJsonMissing(['slug' => 'birthing-home']);
    }

    public function test_only_system_admins_manage_the_catalog(): void
    {
        foreach ([RoleName::Verifier, RoleName::FacilityAdmin, RoleName::FacilityStaff] as $role) {
            Sanctum::actingAs($this->userWithRole($role));
            $this->getJson('/api/v1/admin/catalog/services')->assertForbidden();
            $this->postJson('/api/v1/admin/catalog/services', ['name' => 'X-ray', 'category' => 'diagnostic'])->assertForbidden();
        }
    }
}
