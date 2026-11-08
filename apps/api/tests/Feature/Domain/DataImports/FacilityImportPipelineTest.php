<?php

namespace Tests\Feature\Domain\DataImports;

use App\Domain\DataImports\Actions\DecideStagingRecordAction;
use App\Domain\DataImports\Actions\PublishImportBatchAction;
use App\Domain\DataImports\Enums\ImportBatchStatus;
use App\Domain\DataImports\Enums\ImportFlag;
use App\Domain\DataImports\Enums\MatchStatus;
use App\Domain\DataImports\Enums\StagingDecision;
use App\Domain\DataImports\Events\ImportBatchFailed;
use App\Domain\DataImports\Exceptions\ImportNotReady;
use App\Domain\DataImports\Models\ImportBatch;
use App\Domain\DataImports\Models\ImportStagingRecord;
use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\RunsImports;
use Tests\TestCase;

final class FacilityImportPipelineTest extends TestCase
{
    use RefreshDatabase, RunsImports;

    private User $verifier;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->verifier = $this->userWithRole(RoleName::Verifier);
        $this->importPsgc();
    }

    public function test_staging_matches_and_flags_without_touching_published_data(): void
    {
        $batch = $this->runImport('doh_nhfr', 'nhfr_sample.csv');

        $this->assertSame(ImportBatchStatus::NeedsReview, $batch->status);
        $this->assertEquals(
            ['total' => 8, 'new' => 7, 'updated' => 0, 'unchanged' => 0, 'invalid' => 1, 'flagged' => 3, 'duplicates' => 1, 'conflicts' => 0],
            $batch->counts,
        );
        $this->assertSame(0, Facility::query()->count(), 'Staging must not create facilities.');

        $this->assertFlags($batch, '', [ImportFlag::MissingIdentifier]);
        $this->assertFlags($batch, 'DOH-0007', [ImportFlag::UnknownLocation]);
        $this->assertFlags($batch, 'DOH-0006', [ImportFlag::CoordinatesOutOfBounds]);

        $island = $this->staged($batch, 'DOH-0006');
        $this->assertFalse($island->is_flagged, 'Out-of-bounds coordinates are dropped, not blocking.');
        $this->assertNull($island->payload['latitude']);

        $repeat = $batch->records()->where('source_record_id', 'DOH-0002')->orderByDesc('row_number')->firstOrFail();
        $this->assertTrue($repeat->is_flagged);
        $this->assertStringContainsString('row 3', $repeat->flags[0]['detail']);
    }

    public function test_publishing_is_refused_until_every_flagged_record_is_decided(): void
    {
        $batch = $this->runImport('doh_nhfr', 'nhfr_sample.csv');

        $this->expectException(ImportNotReady::class);
        $this->expectExceptionMessage('Review the 3 flagged record(s)');

        app(PublishImportBatchAction::class)->handle($batch, $this->verifier);
    }

    public function test_reviewed_batch_publishes_verified_facilities_with_provenance(): void
    {
        $batch = $this->reviewSampleBatch();

        $result = app(PublishImportBatchAction::class)->handle($batch->refresh(), $this->verifier);

        $this->assertSame(['created' => 5, 'updated' => 0, 'unchanged' => 0, 'skipped' => 3], $result);
        $this->assertSame(ImportBatchStatus::Published, $batch->refresh()->status);

        $facility = Facility::query()->where('name', 'Antipolo City Health Office')->with(['sources', 'contacts', 'type', 'cityMunicipality', 'barangay'])->firstOrFail();
        $this->assertSame(VerificationStatus::Verified, $facility->verification_status);
        $this->assertSame(PublicationStatus::Published, $facility->publication_status);
        $this->assertSame('import:doh_nhfr', $facility->verification_method);
        $this->assertSame($this->verifier->id, $facility->verified_by);
        $this->assertSame('DOH-0002', $facility->sources->first()->source_record_id);
        $this->assertSame('Health Center', $facility->type->name);
        $this->assertSame('City of Antipolo', $facility->cityMunicipality->name);
        $this->assertSame('Dela Paz', $facility->barangay->name);
        $this->assertEqualsCanonicalizing(['phone', 'email'], $facility->contacts->pluck('contact_type')->all());
        $this->assertDatabaseHas('facility_locations', ['facility_id' => $facility->id]);

        $this->assertDatabaseMissing('facilities', ['name' => 'Mystery Health Center']);
        $this->assertDatabaseHas('facilities', ['name' => 'Cainta Lying-in Clinic']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'import.published', 'resource_id' => $batch->public_id]);
    }

    public function test_reimport_detects_unchanged_updated_conflicting_and_duplicate_records(): void
    {
        app(PublishImportBatchAction::class)->handle($this->reviewSampleBatch()->refresh(), $this->verifier);

        $update = $this->runImport('doh_nhfr', 'nhfr_update.csv');

        $this->assertEquals(
            ['total' => 4, 'new' => 1, 'updated' => 2, 'unchanged' => 1, 'invalid' => 0, 'flagged' => 2, 'duplicates' => 1, 'conflicts' => 1],
            $update->counts,
        );
        $this->assertSame(MatchStatus::Unchanged, $this->staged($update, 'DOH-0001')->match_status);
        $this->assertFlags($update, 'DOH-0002', [ImportFlag::CoordinateConflict]);
        $this->assertStringContainsString('4.8 km', $this->staged($update, 'DOH-0002')->flags[0]['detail']);

        $duplicate = $this->staged($update, 'DOH-0009');
        $this->assertFlags($update, 'DOH-0009', [ImportFlag::DuplicateCandidate]);
        $this->assertSame('Brgy. San Isidro Health Station', $duplicate->duplicateCandidates->first()->facility->name);
        $this->assertSame(100, $duplicate->duplicateCandidates->first()->score);
    }

    public function test_rejected_conflicts_keep_the_published_coordinates(): void
    {
        app(PublishImportBatchAction::class)->handle($this->reviewSampleBatch()->refresh(), $this->verifier);
        $update = $this->runImport('doh_nhfr', 'nhfr_update.csv');

        $decide = app(DecideStagingRecordAction::class);
        $decide->handle($this->staged($update, 'DOH-0002'), StagingDecision::Rejected, 'Coordinates not confirmed', $this->verifier);
        $decide->handle($this->staged($update, 'DOH-0009'), StagingDecision::Rejected, 'Same facility as DOH-0001', $this->verifier);

        $this->assertSame(ImportBatchStatus::ReadyToPublish, $update->refresh()->status);

        $result = app(PublishImportBatchAction::class)->handle($update, $this->verifier);

        $this->assertSame(['created' => 0, 'updated' => 1, 'unchanged' => 1, 'skipped' => 2], $result);
        $this->assertSame(14.5866, Facility::query()->where('name', 'Antipolo City Health Office')->value('latitude'));
        $this->assertDatabaseHas('facilities', ['name' => 'Quezon City Rural Health Unit 3']);
        $this->assertSame('duplicate', DB::table('duplicate_candidates')->value('resolution'));
    }

    public function test_a_file_missing_required_columns_fails_and_changes_nothing(): void
    {
        Event::fake([ImportBatchFailed::class]);

        $batch = $this->runImport('doh_nhfr', 'facility_template.csv');

        $this->assertSame(ImportBatchStatus::Failed, $batch->status);
        $this->assertStringContainsString('Health Facility Code', $batch->error_summary);
        $this->assertSame(0, Facility::query()->count());
        Event::assertDispatched(ImportBatchFailed::class);
    }

    public function test_the_template_source_maps_services_and_contacts(): void
    {
        $batch = $this->runImport('facility_csv', 'facility_template.csv');
        app(PublishImportBatchAction::class)->handle($batch, $this->verifier);

        $facility = Facility::query()->with(['services', 'contacts'])->where('name', 'Sample Template Clinic')->firstOrFail();
        $this->assertEqualsCanonicalizing(['Primary care', 'Immunization'], $facility->services->pluck('name')->all());
        $this->assertSame('facility_csv', $facility->services->first()->pivot->source_name);
        $this->assertEqualsCanonicalizing(['phone', 'email', 'website'], $facility->contacts->pluck('contact_type')->all());
        $this->assertSame('https://example.org', $facility->contacts->firstWhere('contact_type', 'website')->value);
    }

    /** Approve the record without an identifier; reject the unknown-location and repeated-ID rows. */
    private function reviewSampleBatch(): ImportBatch
    {
        $batch = $this->runImport('doh_nhfr', 'nhfr_sample.csv');
        $decide = app(DecideStagingRecordAction::class);

        $decide->handle($this->staged($batch, ''), StagingDecision::Approved, null, $this->verifier);
        $decide->handle($this->staged($batch, 'DOH-0007'), StagingDecision::Rejected, 'Unknown location', $this->verifier);
        $repeat = $batch->records()->where('source_record_id', 'DOH-0002')->orderByDesc('row_number')->firstOrFail();
        $decide->handle($repeat, StagingDecision::Rejected, 'Repeated row', $this->verifier);

        return $batch;
    }

    private function staged(ImportBatch $batch, string $sourceRecordId): ImportStagingRecord
    {
        return $batch->records()
            ->when($sourceRecordId === '', fn ($q) => $q->whereNull('source_record_id'), fn ($q) => $q->where('source_record_id', $sourceRecordId))
            ->orderBy('row_number')
            ->firstOrFail();
    }

    /** @param list<ImportFlag> $expected */
    private function assertFlags(ImportBatch $batch, string $sourceRecordId, array $expected): void
    {
        $this->assertSame(
            array_map(fn (ImportFlag $flag): string => $flag->value, $expected),
            array_column($this->staged($batch, $sourceRecordId)->flags ?? [], 'code'),
        );
    }
}
