<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('import_batches', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->string('source_name', 60)->index();
            $table->string('kind', 20);
            $table->string('source_version', 40)->nullable();
            $table->string('file_path');
            $table->string('original_filename');
            $table->text('usage_terms');
            $table->foreignId('started_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->index();
            $table->string('current_step', 20);
            $table->unsignedInteger('records_processed')->default(0);
            $table->json('counts')->nullable();
            $table->text('error_summary')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->foreignId('published_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('import_staging_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_batch_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('row_number');
            $table->string('source_record_id', 120)->nullable();
            $table->json('payload');
            $table->string('match_status', 20);
            $table->foreignId('matched_facility_id')->nullable()->constrained('facilities')->nullOnDelete();
            $table->json('flags')->nullable();
            $table->boolean('is_flagged')->default(false);
            $table->string('decision', 20)->default('pending');
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->string('decision_reason')->nullable();
            $table->timestamps();

            $table->index(['import_batch_id', 'match_status']);
            $table->index(['import_batch_id', 'is_flagged']);
        });

        Schema::create('duplicate_candidates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_batch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('staging_record_id')->constrained('import_staging_records')->cascadeOnDelete();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->string('reason', 40);
            $table->unsignedTinyInteger('score');
            $table->string('resolution', 20)->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('duplicate_candidates');
        Schema::dropIfExists('import_staging_records');
        Schema::dropIfExists('import_batches');
    }
};
