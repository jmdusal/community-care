<?php

namespace Tests\Feature\Domain\DataImports;

use App\Domain\DataImports\Enums\ImportBatchStatus;
use App\Domain\Geography\Models\Barangay;
use App\Domain\Geography\Models\CityMunicipality;
use App\Domain\Geography\Models\Province;
use App\Domain\Geography\Models\Region;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\RunsImports;
use Tests\TestCase;

final class GeographyImportTest extends TestCase
{
    use RefreshDatabase, RunsImports;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_psgc_rows_are_placed_under_their_parents_by_code(): void
    {
        $batch = $this->importPsgc();

        $this->assertSame(ImportBatchStatus::Published, $batch->status);
        $this->assertEquals(['created' => 10, 'updated' => 0, 'orphaned' => 1, 'total' => 11], $batch->counts);

        $antipolo = CityMunicipality::query()->where('psgc_code', '0405802000')->firstOrFail();
        $this->assertSame('city', $antipolo->kind);
        $this->assertSame('Rizal', $antipolo->province->name);
        $this->assertSame('Region IV-A (CALABARZON)', $antipolo->region->name);
        $this->assertSame(['Dela Paz', 'San Isidro'], $antipolo->barangays()->orderBy('name')->pluck('name')->all());

        $quezonCity = CityMunicipality::query()->where('psgc_code', '1381300000')->firstOrFail();
        $this->assertNull($quezonCity->province_id, 'NCR cities have no province.');
        $this->assertSame('1300000000', $quezonCity->region->psgc_code);
    }

    public function test_rows_with_unknown_levels_or_short_codes_are_skipped(): void
    {
        $this->importPsgc();

        $this->assertSame(2, Region::query()->count());
        $this->assertSame(1, Province::query()->count());
        $this->assertSame(4, Barangay::query()->count());
    }

    public function test_reimporting_the_same_release_updates_instead_of_duplicating(): void
    {
        $this->importPsgc();
        $second = $this->importPsgc();

        $this->assertEquals(['created' => 0, 'updated' => 10, 'orphaned' => 1, 'total' => 11], $second->counts);
        $this->assertSame(2, Region::query()->count());
        $this->assertSame('2026-Q3', Region::query()->value('psgc_release'));
    }
}
