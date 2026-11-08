<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Geography\Models\AreaGeometry;
use App\Domain\Geography\Models\Barangay;
use App\Domain\Geography\Models\CityMunicipality;
use App\Domain\Geography\Models\Province;
use App\Domain\Geography\Models\Region;
use App\Domain\Identity\Enums\RoleName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class AreaMapTest extends TestCase
{
    use RefreshDatabase;

    private const ANTIPOLO = [
        'category' => 'boundary', 'type' => 'administrative', 'lat' => '14.5871972', 'lon' => '121.1759246',
        'boundingbox' => ['14.52', '14.73', '121.11', '121.33'], 'display_name' => 'Antipolo, Rizal, Calabarzon, Philippines',
        'geojson' => ['type' => 'Polygon', 'coordinates' => [[[121.11, 14.52], [121.33, 14.52], [121.33, 14.73], [121.11, 14.52]]]],
    ];

    private CityMunicipality $city;

    private Barangay $barangay;

    protected function setUp(): void
    {
        parent::setUp();

        config(['communitycare.maps.geocoder_url' => 'https://geocoder.test', 'communitycare.maps.min_interval_ms' => 0]);
        Http::preventStrayRequests();
        Sanctum::actingAs($this->userWithRole(RoleName::Verifier));

        $region = Region::query()->create(['psgc_code' => '0400000000', 'name' => 'Region IV-A (CALABARZON)']);
        $province = Province::query()->create(['region_id' => $region->id, 'psgc_code' => '0405800000', 'name' => 'Rizal']);
        $this->city = CityMunicipality::query()->create(['region_id' => $region->id, 'province_id' => $province->id, 'psgc_code' => '0405802000', 'name' => 'City of Antipolo', 'kind' => 'city']);
        $this->barangay = Barangay::query()->create(['city_municipality_id' => $this->city->id, 'psgc_code' => '0405802001', 'name' => 'Calawis']);
    }

    public function test_area_is_geocoded_once_then_served_from_cache_with_its_facilities(): void
    {
        Http::fake(['geocoder.test/*' => Http::response([self::ANTIPOLO])]);
        Facility::factory()->create(['name' => 'On the map', 'city_municipality_id' => $this->city->id, 'latitude' => 14.59, 'longitude' => 121.17]);
        Facility::factory()->create(['name' => 'No coordinates', 'city_municipality_id' => $this->city->id]);

        foreach ([1, 2] as $_) {
            $this->getJson('/api/v1/admin/locations/map?level=city&code=0405802000')
                ->assertOk()
                ->assertJsonPath('data.map.center.lat', 14.587197)
                ->assertJsonPath('data.map.boundary.type', 'Polygon')
                ->assertJsonPath('data.map.approximate', false)
                ->assertJsonCount(1, 'data.facilities')
                ->assertJsonPath('data.facilities.0.name', 'On the map');
        }

        Http::assertSentCount(1);
        Http::assertSent(fn (Request $request): bool => $request['q'] === 'City of Antipolo, Rizal, CALABARZON, Philippines'
            && str_contains($request->header('User-Agent')[0], 'CommunityCare'));
    }

    public function test_a_barangay_missing_from_the_map_falls_back_to_its_city(): void
    {
        Http::fake(function (Request $request) {
            return Http::response(str_starts_with($request['q'], 'Calawis') ? [] : [self::ANTIPOLO]);
        });

        $this->getJson('/api/v1/admin/locations/map?level=barangay&code=0405802001')
            ->assertOk()
            ->assertJsonPath('data.area.name', 'Calawis')
            ->assertJsonPath('data.map.approximate', true)
            ->assertJsonPath('data.map.boundary', null)
            ->assertJsonPath('data.map.center.lng', 121.175925);

        $this->assertDatabaseHas('area_geometries', ['psgc_code' => '0405802001', 'status' => AreaGeometry::NOT_FOUND]);
        $this->assertDatabaseHas('area_geometries', ['psgc_code' => '0405802000', 'status' => AreaGeometry::FOUND]);
    }

    public function test_results_outside_the_philippines_and_non_places_are_ignored(): void
    {
        Http::fake(['geocoder.test/*' => Http::response([
            ['category' => 'building', 'type' => 'yes', 'lat' => '14.5', 'lon' => '121.1', 'boundingbox' => ['14', '15', '121', '122'], 'display_name' => 'A dormitory'],
        ])]);

        $this->getJson('/api/v1/admin/locations/map?level=region&code=0400000000')
            ->assertOk()
            ->assertJsonPath('data.map', null);
    }

    public function test_a_geocoder_outage_returns_no_map_and_is_retried_later(): void
    {
        Http::fake(['geocoder.test/*' => Http::response('down', 503)]);

        $this->getJson('/api/v1/admin/locations/map?level=city&code=0405802000')->assertOk()->assertJsonPath('data.map', null);

        $this->assertDatabaseCount('area_geometries', 0);
    }
}
