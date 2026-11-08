<?php

namespace Tests\Feature\Api\V1\Public;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\RunsImports;
use Tests\TestCase;

final class LocationTest extends TestCase
{
    use RefreshDatabase, RunsImports;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->importPsgc();
    }

    public function test_locations_are_public_and_filtered_by_parent_code(): void
    {
        $this->getJson('/api/v1/locations/regions')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.code', '0400000000');

        $this->getJson('/api/v1/locations/provinces?region_code=0400000000')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Rizal');

        $this->getJson('/api/v1/locations/cities?region_code=1300000000')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Quezon City')
            ->assertJsonPath('data.0.kind', 'city');

        $this->getJson('/api/v1/locations/barangays?city_code=0405802000')
            ->assertOk()
            ->assertJsonPath('data.*.name', ['Dela Paz', 'San Isidro']);
    }

    public function test_barangays_require_a_city_code(): void
    {
        $this->getJson('/api/v1/locations/barangays')
            ->assertUnprocessable()
            ->assertJsonStructure(['error' => ['fields' => ['city_code']]]);
    }
}
