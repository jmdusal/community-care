<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Geography\Models\AreaGeometry;
use App\Domain\Geography\Models\CityMunicipality;
use App\Domain\Geography\Models\Region;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Services\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class DataQualityTest extends TestCase
{
    use RefreshDatabase;

    private CityMunicipality $city;

    protected function setUp(): void
    {
        parent::setUp();

        $region = Region::query()->create(['psgc_code' => '0400000000', 'name' => 'Region IV-A']);
        $this->city = CityMunicipality::query()->create(['region_id' => $region->id, 'psgc_code' => '0405802000', 'name' => 'City of Antipolo', 'kind' => 'city']);
        AreaGeometry::query()->create(['psgc_code' => '0405802000', 'level' => 'city', 'status' => 'found', 'latitude' => 14.6, 'longitude' => 121.2, 'bbox' => [14.5, 121.1, 14.7, 121.3], 'source' => 'test', 'fetched_at' => now()]);
    }

    private function complete(array $attributes = []): Facility
    {
        $facility = Facility::factory()->published()->create(['city_municipality_id' => $this->city->id, 'latitude' => 14.6, 'longitude' => 121.2, ...$attributes]);
        $facility->contacts()->create(['contact_type' => 'phone', 'value' => '(02) 1234 5678', 'is_public' => true]);
        $facility->hours()->create(['day_of_week' => 1, 'opens_at' => '08:00', 'closes_at' => '17:00']);
        $facility->services()->attach(Service::query()->firstOrCreate(['slug' => 'dental'], ['name' => 'Dental', 'category' => 'dental'])->id, ['availability_status' => 'listed']);

        return $facility;
    }

    public function test_each_issue_is_detected_and_complete_records_are_not_listed(): void
    {
        $this->complete(['name' => 'Complete Health Center']);
        $this->complete(['name' => 'Antipolo Rural Health Unit 1']);
        $this->complete(['name' => 'Antipolo Rural Health Unit I']);
        $this->complete(['name' => 'Far Away Clinic', 'latitude' => 10.3, 'longitude' => 123.9]);
        $this->complete(['name' => 'Old Record Clinic', 'verification_status' => VerificationStatus::Stale]);
        Facility::factory()->create(['name' => 'Bare Draft', 'city_municipality_id' => $this->city->id, 'publication_status' => PublicationStatus::Published]);
        Sanctum::actingAs($this->userWithRole(RoleName::Verifier));

        $report = $this->getJson('/api/v1/admin/data-quality')->assertOk()->json('data');

        $issues = collect($report['facilities'])->mapWithKeys(fn (array $row) => [$row['name'] => $row['issues']]);
        $this->assertSame(6, $report['total']);
        $this->assertSame(1, $report['complete']);
        $this->assertFalse($issues->has('Complete Health Center'));
        $this->assertSame(['possible_duplicate'], $issues['Antipolo Rural Health Unit 1']);
        $this->assertSame(['outside_area'], $issues['Far Away Clinic']);
        $this->assertSame(['stale'], $issues['Old Record Clinic']);
        $this->assertEqualsCanonicalizing(['missing_coordinates', 'no_contact', 'no_hours', 'no_services', 'not_verified'], $issues['Bare Draft']);
        $this->assertSame(2, $report['summary']['possible_duplicate']['count']);
    }

    public function test_the_report_follows_the_scope_and_staff_assignments(): void
    {
        $mine = Facility::factory()->create(['name' => 'Mine']);
        Facility::factory()->create(['name' => 'Not mine']);
        $staff = $this->userWithRole(RoleName::FacilityStaff);
        $mine->staff()->attach($staff);

        Sanctum::actingAs($staff);
        $this->getJson('/api/v1/admin/data-quality')->assertOk()->assertJsonPath('data.total', 1)->assertJsonPath('data.facilities.0.name', 'Mine');

        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));
        $this->getJson('/api/v1/admin/data-quality?facility_id='.$mine->public_id)->assertOk()->assertJsonPath('data.total', 1);
    }
}
