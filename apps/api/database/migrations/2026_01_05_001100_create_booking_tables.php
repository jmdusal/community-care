<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Booking is a pilot: only facilities that agreed to take part accept requests.
        Schema::table('facilities', function (Blueprint $table): void {
            $table->boolean('booking_enabled')->default(false)->after('publication_status');
        });

        // Patients give a mobile number so the clinic can reach them, and consent to processing.
        Schema::table('users', function (Blueprint $table): void {
            $table->string('mobile', 20)->nullable()->after('email');
            $table->timestamp('privacy_consent_at')->nullable()->after('mobile');
        });

        // Clinic-approved time slots. booked_count is updated under a row lock.
        Schema::create('clinic_availability', function (Blueprint $table): void {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->unsignedSmallInteger('capacity');
            $table->unsignedSmallInteger('booked_count')->default(0);
            $table->string('status', 20)->default('open');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['facility_id', 'starts_at']);
            $table->unique(['facility_id', 'service_id', 'starts_at']);
        });

        // No medical information: who, where, when, which listed service, and the status.
        Schema::create('appointments', function (Blueprint $table): void {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->string('reference_code', 12)->unique();
            $table->foreignId('patient_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('availability_id')->constrained('clinic_availability')->cascadeOnDelete();
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->string('status', 20)->index();
            $table->string('idempotency_key', 64);
            $table->string('status_reason', 300)->nullable();
            $table->timestamps();

            $table->unique(['patient_id', 'idempotency_key']);
            $table->index(['facility_id', 'status', 'starts_at']);
        });

        Schema::create('appointment_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('appointment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('from_status', 20)->nullable();
            $table->string('to_status', 20);
            $table->string('note', 300)->nullable();
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_events');
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('clinic_availability');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['mobile', 'privacy_consent_at']));
        Schema::table('facilities', fn (Blueprint $table) => $table->dropColumn('booking_enabled'));
    }
};
