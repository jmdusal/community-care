<?php

namespace Tests\Feature\Domain\DataImports;

use App\Domain\DataImports\Jobs\SyncGeographyJob;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Geography\Models\Barangay;
use App\Domain\Geography\Models\CityMunicipality;
use App\Domain\Geography\Models\Province;
use App\Domain\Geography\Models\Region;
use App\Domain\Identity\Enums\RoleName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class GeographySyncTest extends TestCase
{
    use RefreshDatabase;

    private const API = 'https://psgc.test/api/';

    protected function setUp(): void
    {
        parent::setUp();

        config(['communitycare.imports.geography_sources.psgc_api.base_url' => 'https://psgc.test/api']);

        Http::preventStrayRequests();
    }

    private function fakePsgcApi(): void
    {
        Http::fake([
            self::API.'regions.json' => Http::response([
                ['code' => '130000000', 'name' => 'NCR', 'regionName' => 'National Capital Region', 'psgc10DigitCode' => '1300000000'],
                ['code' => '040000000', 'name' => 'CALABARZON', 'regionName' => 'Region IV-A', 'psgc10DigitCode' => '0400000000'],
            ]),
            self::API.'provinces.json' => Http::response([
                ['code' => '045800000', 'name' => 'Rizal', 'psgc10DigitCode' => '0405800000'],
                ['code' => '043400000', 'name' => 'Laguna', 'psgc10DigitCode' => '0403400000'],
            ]),
            self::API.'cities-municipalities.json' => Http::response([
                ['code' => '045802000', 'name' => 'City of Antipolo', 'isCity' => true, 'provinceCode' => '045800000', 'psgc10DigitCode' => '0405802000'],
                // An independent city: its own province-level code, but the API names the province it sits in.
                ['code' => '043405000', 'name' => 'City of Calamba (independent, for the test)', 'isCity' => true, 'provinceCode' => '043400000', 'psgc10DigitCode' => '0403500000'],
                ['code' => '133900000', 'name' => 'City of Manila', 'isCity' => true, 'psgc10DigitCode' => '1380600000'],
            ]),
            self::API.'sub-municipalities.json' => Http::response([
                ['code' => '133901000', 'name' => 'Tondo I/ii', 'psgc10DigitCode' => '1380601000'],
            ]),
            self::API.'regions/130000000/barangays.json' => Http::response([
                ['code' => '133901001', 'name' => 'Barangay 1', 'psgc10DigitCode' => '1380601001'],
                ['code' => '133901999', 'name' => 'No ten-digit code', 'psgc10DigitCode' => ''],
            ]),
            self::API.'regions/040000000/barangays.json' => Http::response([
                ['code' => '045802001', 'name' => 'Dela Paz', 'psgc10DigitCode' => '0405802001'],
            ]),
        ]);
    }

    public function test_command_imports_every_level_and_keeps_existing_links(): void
    {
        $this->fakePsgcApi();
        $calabarzon = Region::query()->create(['psgc_code' => '0400000000', 'name' => 'Old name']);
        $facility = Facility::factory()->create(['region_id' => $calabarzon->id]);

        $this->artisan('communitycare:sync-geography', ['--sync' => true])->assertSuccessful();

        $this->assertSame(['National Capital Region (NCR)', 'Region IV-A (CALABARZON)'], Region::query()->orderBy('name')->pluck('name')->all());
        $this->assertSame($calabarzon->id, $facility->refresh()->region_id);
        $this->assertSame(2, Province::query()->count());

        $independent = CityMunicipality::query()->where('psgc_code', '0403500000')->firstOrFail();
        $this->assertNull($independent->province_id);
        $this->assertSame('Laguna', $independent->geographicProvince->name);
        $this->assertNull(CityMunicipality::query()->where('psgc_code', '0405802000')->value('geographic_province_id'));

        $antipolo = CityMunicipality::query()->where('psgc_code', '0405802000')->firstOrFail();
        $this->assertSame('city', $antipolo->kind);
        $this->assertNotNull($antipolo->province_id);
        $this->assertNull(CityMunicipality::query()->where('psgc_code', '1380600000')->value('province_id'));

        $this->assertSame(2, Barangay::query()->count());

        // Locations lists the independent city under the province it sits in.
        Sanctum::actingAs($this->userWithRole(RoleName::Verifier));
        $this->getJson('/api/v1/admin/locations/coverage?level=city&parent_code=0403400000')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'City of Calamba (independent, for the test)')
            ->assertJsonPath('data.0.independent', true);
        $this->assertSame('Tondo I/ii', Barangay::query()->where('psgc_code', '1380601001')->firstOrFail()->cityMunicipality->name);

        $this->assertDatabaseHas('import_batches', ['source_name' => 'psgc_api', 'status' => 'published']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'import.published']);
    }

    public function test_admins_can_queue_a_sync_but_staff_cannot(): void
    {
        Queue::fake();

        Sanctum::actingAs($this->userWithRole(RoleName::FacilityStaff));
        $this->postJson('/api/v1/admin/locations/sync')->assertForbidden();

        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));
        $this->postJson('/api/v1/admin/locations/sync')->assertAccepted()->assertJsonPath('data.status', 'queued');

        Queue::assertPushed(SyncGeographyJob::class);
    }

    public function test_a_download_failure_fails_the_command_without_changing_data(): void
    {
        Http::fake([self::API.'*' => Http::response('Service unavailable', 503)]);
        Region::query()->create(['psgc_code' => '0400000000', 'name' => 'Region IV-A']);

        $this->artisan('communitycare:sync-geography', ['--sync' => true])->assertFailed();

        $this->assertSame(1, Region::query()->count());
        $this->assertDatabaseCount('import_batches', 0);
    }

    public function test_independent_cities_without_a_province_link_get_their_own_entry(): void
    {
        $region = Region::query()->create(['psgc_code' => '0900000000', 'name' => 'Region IX (Zamboanga Peninsula)']);
        Province::query()->create(['region_id' => $region->id, 'psgc_code' => '0907200000', 'name' => 'Zamboanga Del Norte']);
        CityMunicipality::query()->create(['region_id' => $region->id, 'psgc_code' => '0990100000', 'name' => 'City of Isabela', 'kind' => 'city']);
        Sanctum::actingAs($this->userWithRole(RoleName::Verifier));

        $this->getJson('/api/v1/admin/locations/coverage?level=province&parent_code=0900000000')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.1.name', 'Independent cities')
            ->assertJsonPath('data.1.code', '0900000000');

        $this->getJson('/api/v1/admin/locations/coverage?level=city&parent_code=0900000000')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'City of Isabela');
    }
}
