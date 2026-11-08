<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Public health campaigns (vaccination drives, screenings…) and the facilities taking part.
        Schema::create('health_programs', function (Blueprint $table): void {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->string('title');
            $table->string('category', 40)->index();
            $table->string('summary', 300);
            $table->text('description');
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->string('source_name')->nullable();
            $table->string('source_url', 2048)->nullable();
            $table->string('status', 20)->default('draft')->index();
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('program_facilities', function (Blueprint $table): void {
            $table->foreignId('health_program_id')->constrained()->cascadeOnDelete();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->primary(['health_program_id', 'facility_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('program_facilities');
        Schema::dropIfExists('health_programs');
    }
};
