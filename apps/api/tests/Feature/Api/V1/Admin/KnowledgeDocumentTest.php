<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\KnowledgeAssistant\Models\KnowledgeDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class KnowledgeDocumentTest extends TestCase
{
    use RefreshDatabase;

    private const DOCUMENT = [
        'title' => 'Free TB screening',
        'body' => 'TB-DOTS centers screen and treat tuberculosis for free under the national program.',
        'topic' => 'tuberculosis',
        'source_name' => 'DOH National TB Program',
        'source_url' => 'https://doh.gov.ph/tb',
    ];

    public function test_verifier_creates_edits_publishes_and_archives_a_document(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::Verifier));

        $id = $this->postJson('/api/v1/admin/knowledge-documents', self::DOCUMENT)
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.is_stale', true)
            ->json('data.id');

        $this->postJson("/api/v1/admin/knowledge-documents/{$id}/publish")
            ->assertConflict()
            ->assertJsonPath('error.code', 'conflict');

        $this->patchJson("/api/v1/admin/knowledge-documents/{$id}", [...self::DOCUMENT, 'verified_at' => now()->subDay()->toIso8601String()])
            ->assertOk()
            ->assertJsonPath('data.is_stale', false);

        $this->postJson("/api/v1/admin/knowledge-documents/{$id}/publish")->assertOk()->assertJsonPath('data.status', 'published');
        $this->postJson("/api/v1/admin/knowledge-documents/{$id}/archive")->assertOk()->assertJsonPath('data.status', 'archived');

        $this->getJson('/api/v1/admin/knowledge-documents?status=archived')->assertOk()->assertJsonPath('meta.total', 1);

        foreach (['created', 'updated', 'published', 'archived'] as $change) {
            $this->assertDatabaseHas('audit_logs', ['action' => "knowledge_document.{$change}", 'resource_id' => $id]);
        }
    }

    public function test_saving_unchanged_content_writes_no_audit_entry(): void
    {
        $user = $this->userWithRole(RoleName::SystemAdmin);
        Sanctum::actingAs($user);
        $id = $this->postJson('/api/v1/admin/knowledge-documents', self::DOCUMENT)->json('data.id');

        $this->patchJson("/api/v1/admin/knowledge-documents/{$id}", self::DOCUMENT)->assertOk();

        $this->assertDatabaseMissing('audit_logs', ['action' => 'knowledge_document.updated']);
    }

    public function test_validation_and_permissions(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::FacilityStaff));
        $this->postJson('/api/v1/admin/knowledge-documents', self::DOCUMENT)->assertForbidden();
        $this->getJson('/api/v1/admin/knowledge-documents')->assertForbidden();

        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));
        $this->postJson('/api/v1/admin/knowledge-documents', ['title' => '', 'body' => 'short', 'source_url' => 'not a url'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'body', 'source_name', 'source_url'], 'error.fields');

        $this->assertSame(0, KnowledgeDocument::query()->count());
    }
}
