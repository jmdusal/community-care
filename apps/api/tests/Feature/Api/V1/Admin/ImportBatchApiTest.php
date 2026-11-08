<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\DataImports\Jobs\RunImportBatch;
use App\Domain\Identity\Enums\RoleName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\RunsImports;
use Tests\TestCase;

final class ImportBatchApiTest extends TestCase
{
    use RefreshDatabase, RunsImports;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_facility_staff_cannot_import(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::FacilityStaff));

        $this->getJson('/api/v1/admin/import-batches')->assertForbidden();
        $this->postJson('/api/v1/admin/import-batches', $this->uploadPayload())->assertForbidden();
    }

    public function test_upload_stores_the_file_and_queues_the_pipeline(): void
    {
        Queue::fake();
        Sanctum::actingAs($this->userWithRole(RoleName::Verifier));

        $response = $this->post('/api/v1/admin/import-batches', $this->uploadPayload(), ['Accept' => 'application/json']);

        $response->assertAccepted()
            ->assertJsonPath('data.source', 'doh_nhfr')
            ->assertJsonPath('data.status', 'queued')
            ->assertJsonPath('data.current_step', 'acquire');

        Queue::assertPushed(RunImportBatch::class);
        $this->assertCount(1, Storage::disk('local')->files('imports'));
    }

    public function test_upload_requires_usage_terms_and_confirmation(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));

        $this->post('/api/v1/admin/import-batches', ['source' => 'doh_nhfr', 'file' => UploadedFile::fake()->createWithContent('x.csv', "a,b\n1,2")], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonStructure(['error' => ['fields' => ['usage_terms', 'terms_recorded']]]);
    }

    public function test_review_flow_over_the_api(): void
    {
        Sanctum::actingAs($verifier = $this->userWithRole(RoleName::Verifier));
        $this->importPsgc();
        $batch = $this->runImport('doh_nhfr', 'nhfr_sample.csv', $verifier);

        $this->getJson("/api/v1/admin/import-batches/{$batch->public_id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'needs_review')
            ->assertJsonPath('data.pending_flagged', 3);

        $flagged = $this->getJson("/api/v1/admin/import-batches/{$batch->public_id}/records?flagged=1")
            ->assertOk()
            ->assertJsonPath('meta.total', 3)
            ->json('data');

        $this->postJson("/api/v1/admin/import-batches/{$batch->public_id}/publish")
            ->assertConflict()
            ->assertJsonPath('error.code', 'conflict');

        $this->postJson("/api/v1/admin/import-batches/{$batch->public_id}/records/{$flagged[0]['id']}/decision", ['decision' => 'rejected'])
            ->assertUnprocessable()
            ->assertJsonStructure(['error' => ['fields' => ['reason']]]);

        foreach ($flagged as $record) {
            $this->postJson("/api/v1/admin/import-batches/{$batch->public_id}/records/{$record['id']}/decision", ['decision' => 'rejected', 'reason' => 'Not verified'])
                ->assertOk()
                ->assertJsonPath('data.decision', 'rejected');
        }

        $this->postJson("/api/v1/admin/import-batches/{$batch->public_id}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', 'published')
            ->assertJsonPath('meta.result.created', 4);
    }

    public function test_records_cannot_be_decided_through_another_batch(): void
    {
        Sanctum::actingAs($verifier = $this->userWithRole(RoleName::Verifier));
        $this->importPsgc();
        $first = $this->runImport('doh_nhfr', 'nhfr_sample.csv', $verifier);
        $second = $this->runImport('doh_nhfr', 'nhfr_update.csv', $verifier);
        $recordFromFirst = $first->records()->value('id');

        $this->postJson("/api/v1/admin/import-batches/{$second->public_id}/records/{$recordFromFirst}/decision", ['decision' => 'approved'])
            ->assertNotFound();
    }

    public function test_sources_and_location_coverage_are_listed(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));
        $this->importPsgc();

        $this->getJson('/api/v1/admin/import-sources')
            ->assertOk()
            ->assertJsonFragment(['key' => 'doh_nhfr', 'kind' => 'facilities'])
            ->assertJsonFragment(['key' => 'psa_psgc', 'kind' => 'geography']);

        $this->getJson('/api/v1/admin/locations/coverage?level=city&parent_code=1300000000')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Quezon City')
            ->assertJsonPath('data.0.facilities', 0);
    }

    /** @return array<string, mixed> */
    private function uploadPayload(): array
    {
        return [
            'source' => 'doh_nhfr',
            'file' => UploadedFile::fake()->createWithContent('nhfr.csv', (string) file_get_contents($this->fixture('nhfr_sample.csv'))),
            'source_version' => '2026-11-07',
            'usage_terms' => 'Confirm redistribution terms before publishing.',
            'terms_recorded' => true,
        ];
    }
}
