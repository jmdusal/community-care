<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Facilities\Enums\ChangeOrigin;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityChangeRequest;
use App\Domain\Geography\Models\Region;
use App\Domain\Identity\Enums\RoleName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** The admin console's facility / region picker narrows the lists, and their counts, to that scope. */
final class ScopeFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_facility_list_and_counts_follow_the_selected_facility_or_region(): void
    {
        $ncr = Region::query()->create(['psgc_code' => '1300000000', 'name' => 'NCR']);
        $calabarzon = Region::query()->create(['psgc_code' => '0400000000', 'name' => 'Region IV-A']);
        $one = Facility::factory()->published()->create(['name' => 'Alpha Center', 'region_id' => $ncr->id]);
        Facility::factory()->published()->create(['name' => 'Beta Center', 'region_id' => $ncr->id]);
        Facility::factory()->create(['name' => 'Gamma Center', 'region_id' => $calabarzon->id]);
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));

        $this->getJson('/api/v1/admin/facilities?facility_id='.$one->public_id)
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Alpha Center')
            ->assertJsonPath('meta.status_counts', ['verified' => 1]);

        $this->getJson('/api/v1/admin/facilities?region_code=1300000000')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('meta.status_counts', ['verified' => 2]);
    }

    public function test_review_queue_follows_the_selected_region(): void
    {
        $ncr = Region::query()->create(['psgc_code' => '1300000000', 'name' => 'NCR']);
        $other = Region::query()->create(['psgc_code' => '0400000000', 'name' => 'Region IV-A']);
        $submitter = $this->userWithRole(RoleName::FacilityStaff);

        foreach ([$ncr, $other] as $region) {
            FacilityChangeRequest::query()->create([
                'facility_id' => Facility::factory()->published()->create(['region_id' => $region->id])->id,
                'submitted_by' => $submitter->id,
                'origin' => ChangeOrigin::Edit,
                'changes' => ['name' => ['from' => 'A', 'to' => 'B']],
                'status' => 'submitted',
            ]);
        }

        Sanctum::actingAs($this->userWithRole(RoleName::Verifier));

        $this->getJson('/api/v1/admin/change-requests?region_code=1300000000')->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('meta.queue.pending_changes', 1);
        $this->getJson('/api/v1/admin/change-requests')->assertOk()->assertJsonPath('meta.total', 2);
    }
}
