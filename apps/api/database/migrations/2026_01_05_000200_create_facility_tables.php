<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facility_types', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 80)->unique();
            $table->string('name');
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 80)->unique();
            $table->string('name');
            $table->string('category', 60)->default('general');
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('facilities', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->string('name');
            $table->foreignId('facility_type_id')->nullable()->constrained()->nullOnDelete();
            $table->string('address', 500)->nullable();
            $table->foreignId('region_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('province_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('city_municipality_id')->nullable()->constrained('cities_municipalities')->nullOnDelete();
            $table->foreignId('barangay_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('latitude', 9, 6)->nullable();
            $table->decimal('longitude', 9, 6)->nullable();
            $table->string('verification_status', 20)->default('draft')->index();
            $table->string('publication_status', 20)->default('unpublished')->index();
            $table->timestamp('verified_at')->nullable()->index();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('verification_method', 60)->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();

            $table->fullText(['name', 'address']);
        });

        // Coordinates as a spatial POINT (SRID 4326, axis order latitude-longitude in MySQL).
        // A separate table keeps the column NOT NULL, which a SPATIAL INDEX requires,
        // while facilities without coordinates simply have no row here.
        Schema::create('facility_locations', function (Blueprint $table) {
            $table->foreignId('facility_id')->primary()->constrained()->cascadeOnDelete();
            $table->geography('location', subtype: 'point', srid: 4326);
            $table->spatialIndex('location');
        });

        Schema::create('facility_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();
            $table->string('availability_status', 20)->default('listed');
            $table->string('source_name', 60)->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->unique(['facility_id', 'service_id']);
        });

        Schema::create('facility_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->string('contact_type', 20);
            $table->string('value');
            $table->boolean('is_public')->default(true);
            $table->timestamps();
        });

        Schema::create('facility_hours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->time('opens_at');
            $table->time('closes_at');
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index(['facility_id', 'day_of_week']);
        });

        Schema::create('facility_hour_exceptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->boolean('is_closed')->default(true);
            $table->time('opens_at')->nullable();
            $table->time('closes_at')->nullable();
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->unique(['facility_id', 'date']);
        });

        Schema::create('facility_sources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->string('source_name', 60);
            $table->string('source_url', 500)->nullable();
            $table->string('source_record_id', 120);
            $table->char('payload_hash', 64)->nullable();
            $table->timestamp('checked_at')->nullable();
            $table->timestamp('imported_at')->nullable();
            $table->timestamps();

            $table->unique(['source_name', 'source_record_id']);
        });
    }

    public function down(): void
    {
        foreach (['facility_sources', 'facility_hour_exceptions', 'facility_hours', 'facility_contacts', 'facility_services', 'facility_locations', 'facilities', 'services', 'facility_types'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
