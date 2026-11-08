<?php

namespace Database\Seeders;

use App\Domain\KnowledgeAssistant\Enums\DocumentStatus;
use App\Domain\KnowledgeAssistant\Models\KnowledgeDocument;
use Illuminate\Database\Seeder;

/**
 * Local development only: a few general documents so the assistant has
 * something to quote. Real content must come from official sources and be
 * reviewed before launch.
 */
class SampleKnowledgeDocumentSeeder extends Seeder
{
    private const SOURCE = 'CommunityCare sample content (local only)';

    public function run(): void
    {
        $documents = [
            [
                'title' => 'Emergency hotline 911',
                'topic' => 'emergency',
                'body' => 'In the Philippines, call 911 for medical emergencies, fire and crime. For a medical emergency such as chest pain, difficulty breathing, heavy bleeding, loss of consciousness or seizures, call 911 or go to the nearest hospital emergency room right away. Do not wait for a reply from an online service.',
            ],
            [
                'title' => 'How CommunityCare verifies facility information',
                'topic' => 'verification',
                'body' => 'Facility records start from public registries such as the DOH National Health Facility Registry. A CommunityCare verifier reviews changes before they are published. "Verified" means our team checked the record on the date shown; it is not a license or accreditation. Records not re-checked for a while are marked as possibly out of date. Always call the facility to confirm hours and services before visiting.',
            ],
            [
                'title' => 'What to bring to a health center visit',
                'topic' => 'visit',
                'body' => 'When visiting a barangay health station or rural health unit, bring a valid ID, your PhilHealth number if you have one, any previous records or test results, your child\'s vaccination card if the visit is for a child, and a list of medicines you take. Ask the health center about their consultation schedule, as some services are only offered on certain days.',
            ],
        ];

        foreach ($documents as $document) {
            KnowledgeDocument::query()->updateOrCreate(['title' => $document['title']], [
                ...$document,
                'source_name' => self::SOURCE,
                'status' => DocumentStatus::Published,
                'verified_at' => now(),
                'published_at' => now(),
            ]);
        }
    }
}
