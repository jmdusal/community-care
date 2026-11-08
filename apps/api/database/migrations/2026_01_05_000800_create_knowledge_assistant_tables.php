<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Approved public health information the assistant may quote (FAQs, program notes, official guidance).
        Schema::create('knowledge_documents', function (Blueprint $table): void {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->string('title');
            $table->longText('body');
            $table->string('topic', 60)->nullable()->index();
            $table->string('source_name');
            $table->string('source_url', 2048)->nullable();
            $table->string('status', 20)->default('draft')->index();
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->fullText(['title', 'body']);
        });

        // One row per question, for monitoring outcomes and latency.
        // The question text is never stored: it may contain personal or medical details.
        Schema::create('assistant_interactions', function (Blueprint $table): void {
            $table->id();
            $table->string('channel', 20);
            $table->string('outcome', 30)->index();
            $table->string('provider', 30);
            $table->unsignedInteger('latency_ms');
            $table->unsignedSmallInteger('citation_count')->default(0);
            $table->boolean('used_fallback')->default(false);
            $table->timestamp('created_at')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assistant_interactions');
        Schema::dropIfExists('knowledge_documents');
    }
};
