<?php

namespace Tests\Feature\Api\V1\Booking;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class WalkInQueueTest extends TestCase
{
    use RefreshDatabase;

    private Facility $facility;

    private User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->facility = Facility::factory()->published()->create();
        $this->staff = $this->userWithRole(RoleName::FacilityStaff);
        $this->facility->staff()->attach($this->staff);
    }

    public function test_staff_add_walk_ins_call_them_in_order_and_the_display_shows_numbers_only(): void
    {
        Sanctum::actingAs($this->staff);
        $url = "/api/v1/admin/facilities/{$this->facility->public_id}/queue";

        $first = $this->postJson($url, ['name' => 'Juana Cruz', 'mobile' => '0917 123 4567'])->assertCreated()->assertJsonPath('data.number', '001')->assertJsonPath('data.mobile', '+639171234567');
        $this->postJson($url, [])->assertCreated()->assertJsonPath('data.number', '002');

        $this->postJson("{$url}/call-next", ['counter' => 'Window 1'])->assertOk()->assertJsonPath('data.number', '001')->assertJsonPath('data.status', 'called');
        $this->postJson('/api/v1/admin/queue/'.$first->json('data.id').'/serve')->assertOk()->assertJsonPath('data.status', 'serving');

        $display = $this->getJson("/api/v1/facilities/{$this->facility->public_id}/queue")
            ->assertOk()
            ->assertJsonPath('data.now_serving.0.number', '001')
            ->assertJsonPath('data.now_serving.0.counter', 'Window 1')
            ->assertJsonPath('data.waiting', 1)
            ->assertJsonPath('data.next', ['002']);
        $this->assertStringNotContainsString('Juana', $display->getContent());

        $this->postJson('/api/v1/admin/queue/'.$first->json('data.id').'/done')->assertOk();
        $this->postJson('/api/v1/admin/queue/'.$first->json('data.id').'/serve')->assertConflict();

        $this->getJson($url)->assertOk()->assertJsonPath('meta.counts.done', 1)->assertJsonPath('meta.counts.waiting', 1);
        $this->postJson("{$url}/call-next")->assertOk()->assertJsonPath('data.number', '002');
        $this->postJson("{$url}/call-next")->assertNotFound();
    }

    public function test_numbers_start_again_each_day(): void
    {
        Sanctum::actingAs($this->staff);
        $url = "/api/v1/admin/facilities/{$this->facility->public_id}/queue";

        $this->postJson($url, [])->assertJsonPath('data.number', '001');
        $this->travel(1)->days();
        $this->postJson($url, [])->assertJsonPath('data.number', '001');
    }

    public function test_only_staff_of_the_facility_run_its_queue(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::FacilityStaff));

        $this->postJson("/api/v1/admin/facilities/{$this->facility->public_id}/queue", [])->assertForbidden();
    }
}
