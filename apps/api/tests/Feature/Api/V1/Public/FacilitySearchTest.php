<?php

namespace Tests\Feature\Api\V1\Public;

use App\Domain\Facilities\Contracts\FacilityWriter;
use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityType;
use App\Domain\Geography\Models\CityMunicipality;
use App\Domain\Geography\Models\Region;
use App\Domain\Services\Models\Service;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Tests\TestCase;

/**
 * Uses truncation instead of transactions: InnoDB FULLTEXT indexes only see
 * committed rows, so a rolled-back test transaction would hide every match.
 */
final class FacilitySearchTest extends TestCase
{
    use DatabaseTruncation;

    private Facility $manila;

    private Facility $quezon;

    private Facility $antipolo;

    protected function setUp(): void
    {
        parent::setUp();

        $ncr = Region::query()->create(['psgc_code' => '1300000000', 'name' => 'NCR']);
        $calabarzon = Region::query()->create(['psgc_code' => '0400000000', 'name' => 'Region IV-A']);
        $qc = CityMunicipality::query()->create(['region_id' => $ncr->id, 'psgc_code' => '1381300000', 'name' => 'Quezon City', 'kind' => 'city']);
        $healthCenter = FacilityType::query()->create(['slug' => 'health-center', 'name' => 'Health Center']);
        $immunization = Service::query()->create(['slug' => 'immunization', 'name' => 'Immunization', 'category' => 'preventive']);

        $writer = app(FacilityWriter::class);

        $this->manila = Facility::factory()->published()->create(['name' => 'Manila Health Center', 'address' => 'Ermita, Manila', 'region_id' => $ncr->id, 'facility_type_id' => $healthCenter->id, 'latitude' => 14.5995, 'longitude' => 120.9842]);
        $writer->setLocation($this->manila, 14.5995, 120.9842);

        $this->quezon = Facility::factory()->published()->create(['name' => 'Quezon City RHU 3', 'address' => 'Commonwealth Ave', 'region_id' => $ncr->id, 'city_municipality_id' => $qc->id, 'latitude' => 14.6760, 'longitude' => 121.0437, 'verification_status' => VerificationStatus::Stale]);
        $writer->setLocation($this->quezon, 14.6760, 121.0437);
        $this->quezon->services()->attach($immunization->id, ['availability_status' => 'listed']);

        $this->antipolo = Facility::factory()->published()->create(['name' => 'Antipolo City Health Office', 'address' => 'M.L. Quezon Ave, Antipolo', 'region_id' => $calabarzon->id, 'facility_type_id' => $healthCenter->id, 'latitude' => 14.5866, 'longitude' => 121.1760]);
        $writer->setLocation($this->antipolo, 14.5866, 121.1760);

        Facility::factory()->create(['name' => 'Unpublished Draft Health Center']);
    }

    /** Leave the database empty for the transaction-based tests that run after this class. */
    protected function tearDown(): void
    {
        $this->truncateTablesForAllConnections();

        parent::tearDown();
    }

    public function test_only_published_facilities_are_listed(): void
    {
        $this->getJson('/api/v1/facilities')
            ->assertOk()
            ->assertJsonPath('meta.total', 3)
            ->assertJsonMissing(['name' => 'Unpublished Draft Health Center'])
            ->assertJsonPath('data.0.name', 'Antipolo City Health Office');
    }

    public function test_text_search_matches_name_and_address_prefixes(): void
    {
        $this->getJson('/api/v1/facilities?q=health cent')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Manila Health Center');

        $this->getJson('/api/v1/facilities?q=quezon')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);
    }

    public function test_short_words_fall_back_to_like_matching(): void
    {
        $this->getJson('/api/v1/facilities?q=RHU 3')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Quezon City RHU 3');
    }

    public function test_filters_by_location_type_service_and_verification(): void
    {
        $this->getJson('/api/v1/facilities?region_code=0400000000')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.name', 'Antipolo City Health Office');
        $this->getJson('/api/v1/facilities?city_code=1381300000')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/facilities?type=health-center')->assertJsonPath('meta.total', 2);
        $this->getJson('/api/v1/facilities?service=immunization')->assertJsonPath('data.0.name', 'Quezon City RHU 3');
        $this->getJson('/api/v1/facilities?verified_only=1')->assertJsonPath('meta.total', 2);
    }

    public function test_nearby_search_orders_by_distance_within_the_radius(): void
    {
        $response = $this->getJson('/api/v1/facilities?lat=14.6000&lng=120.9850&radius_km=15')->assertOk();

        $this->assertSame(['Manila Health Center', 'Quezon City RHU 3'], array_column($response->json('data'), 'name'));
        $this->assertEqualsWithDelta(0.1, $response->json('data.0.distance_km'), 0.1);
        $this->assertEqualsWithDelta(10.5, $response->json('data.1.distance_km'), 0.6);
    }

    public function test_radius_is_capped_by_the_settings(): void
    {
        $this->getJson('/api/v1/facilities?lat=14.6&lng=121&radius_km=500')
            ->assertUnprocessable()
            ->assertJsonStructure(['error' => ['fields' => ['radius_km']]]);
    }

    public function test_detail_shows_verification_notice_and_hides_internal_fields(): void
    {
        $this->getJson("/api/v1/facilities/{$this->quezon->public_id}")
            ->assertOk()
            ->assertJsonPath('data.verification.status', 'stale')
            ->assertJsonPath('data.verification.is_stale', true)
            ->assertJsonPath('data.verification.notice', 'Platform review status, not a license or accreditation.')
            ->assertJsonPath('data.services.0.slug', 'immunization')
            ->assertJsonMissingPath('data.review_notes')
            ->assertJsonMissingPath('data.verified_by');

        $this->assertDatabaseHas('usage_events', ['event' => 'profile_view', 'facility_id' => $this->quezon->id]);
    }

    public function test_unpublished_facilities_return_not_found(): void
    {
        $draft = Facility::query()->where('name', 'Unpublished Draft Health Center')->firstOrFail();

        $this->getJson("/api/v1/facilities/{$draft->public_id}")->assertNotFound();
    }

    public function test_searches_and_clicks_are_counted_anonymously(): void
    {
        $this->getJson('/api/v1/facilities?q=quezon');
        $this->postJson("/api/v1/facilities/{$this->antipolo->public_id}/events", ['event' => 'call_click'])->assertNoContent();
        $this->postJson("/api/v1/facilities/{$this->antipolo->public_id}/events", ['event' => 'hack'])->assertUnprocessable();

        $this->assertDatabaseHas('usage_events', ['event' => 'search', 'result_count' => 2, 'query_hash' => hash('sha256', 'quezon')]);
        $this->assertDatabaseHas('usage_events', ['event' => 'call_click', 'facility_id' => $this->antipolo->id]);
    }

    public function test_catalogs_count_published_facilities(): void
    {
        $this->getJson('/api/v1/services')->assertOk()->assertJsonFragment(['slug' => 'immunization', 'facilities' => 1]);
        $this->getJson('/api/v1/facility-types')->assertOk()->assertJsonFragment(['slug' => 'health-center', 'facilities' => 2]);
    }
}
