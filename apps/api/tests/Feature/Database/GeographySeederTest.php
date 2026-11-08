<?php

namespace Tests\Feature\Database;

use App\Domain\Geography\Models\Barangay;
use App\Domain\Geography\Models\CityMunicipality;
use App\Domain\Geography\Models\Region;
use Database\Seeders\GeographySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class GeographySeederTest extends TestCase
{
    use RefreshDatabase;

    private const API = 'https://psgc.test/api/';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'communitycare.imports.geography_sources.psgc_api.base_url' => 'https://psgc.test/api',
            'communitycare.imports.geography_sources.psa_psgc.seed_file' => '',
        ]);
        Http::preventStrayRequests();
    }

    public function test_seeding_downloads_every_level_from_the_api(): void
    {
        Http::fake([
            self::API.'regions.json' => Http::response([['code' => '040000000', 'name' => 'CALABARZON', 'regionName' => 'Region IV-A', 'psgc10DigitCode' => '0400000000']]),
            self::API.'provinces.json' => Http::response([['code' => '045800000', 'name' => 'Rizal', 'psgc10DigitCode' => '0405800000']]),
            self::API.'cities-municipalities.json' => Http::response([['code' => '045802000', 'name' => 'City of Antipolo', 'isCity' => true, 'provinceCode' => '045800000', 'psgc10DigitCode' => '0405802000']]),
            self::API.'sub-municipalities.json' => Http::response([]),
            self::API.'regions/040000000/barangays.json' => Http::response([['code' => '045802001', 'name' => 'Calawis', 'psgc10DigitCode' => '0405802001']]),
        ]);

        $this->seed(GeographySeeder::class);

        $this->assertSame('Region IV-A (CALABARZON)', Region::query()->value('name'));
        $this->assertSame(1, CityMunicipality::query()->count());
        $this->assertSame(1, Barangay::query()->count());
    }

    public function test_seeding_offline_warns_and_does_not_fail(): void
    {
        Http::fake(['*' => Http::response('unreachable', 503)]);

        $this->seed(GeographySeeder::class);

        $this->assertSame(0, Region::query()->count());
    }

    public function test_a_saved_psa_file_is_imported_too(): void
    {
        Http::fake(['*' => Http::response('unreachable', 503)]);
        config(['communitycare.imports.geography_sources.psa_psgc.seed_file' => base_path('tests/Fixtures/imports/psgc_sample.csv')]);

        $this->seed(GeographySeeder::class);

        $this->assertGreaterThan(0, Barangay::query()->count());
        $this->assertDatabaseHas('import_batches', ['source_name' => 'psa_psgc', 'status' => 'published']);
    }
}
