<?php

namespace Tests\Feature\Domain\Facilities;

use App\Domain\Facilities\Contracts\FacilityWriter;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Geography\Support\Distance;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Guards the MySQL axis-order trap: SRID 4326 is latitude-longitude in MySQL,
 * so a swapped point would put Manila in the ocean and distances would be wrong.
 */
final class FacilityLocationTest extends TestCase
{
    use RefreshDatabase;

    public function test_points_are_stored_with_the_right_axis_order(): void
    {
        $facility = Facility::factory()->create();
        app(FacilityWriter::class)->setLocation($facility, 14.5995, 120.9842);

        $row = DB::selectOne('SELECT ST_Latitude(location) AS lat, ST_Longitude(location) AS lng FROM facility_locations WHERE facility_id = ?', [$facility->id]);

        $this->assertEqualsWithDelta(14.5995, (float) $row->lat, 0.000001);
        $this->assertEqualsWithDelta(120.9842, (float) $row->lng, 0.000001);
    }

    public function test_database_distance_matches_the_php_distance(): void
    {
        $manila = Facility::factory()->create();
        $quezonCity = Facility::factory()->create();
        $writer = app(FacilityWriter::class);
        $writer->setLocation($manila, 14.5995, 120.9842);
        $writer->setLocation($quezonCity, 14.6760, 121.0437);

        $meters = (float) DB::scalar(
            'SELECT ST_Distance_Sphere(a.location, b.location) FROM facility_locations a, facility_locations b WHERE a.facility_id = ? AND b.facility_id = ?',
            [$manila->id, $quezonCity->id],
        );

        $this->assertEqualsWithDelta(Distance::km(14.5995, 120.9842, 14.6760, 121.0437), $meters / 1000, 0.1);
        $this->assertEqualsWithDelta(10.6, $meters / 1000, 0.5);
    }
}
