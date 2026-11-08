<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Booking rules per facility (null = use the system default from Settings),
        // and when its staff were last reminded to check the facility's details.
        Schema::table('facilities', function (Blueprint $table): void {
            $table->unsignedTinyInteger('booking_max_active')->nullable()->after('booking_enabled');
            $table->unsignedSmallInteger('booking_cancel_cutoff_hours')->nullable()->after('booking_max_active');
            $table->unsignedSmallInteger('booking_min_notice_hours')->nullable()->after('booking_cancel_cutoff_hours');
            $table->timestamp('check_reminded_at')->nullable();
        });

        // Walk-in queue: a number per facility per day, called in order.
        Schema::create('queue_tickets', function (Blueprint $table): void {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->date('queue_date');
            $table->unsignedSmallInteger('number');
            // No medical information: a name and mobile are optional, for calling people back.
            $table->string('name', 120)->nullable();
            $table->string('mobile', 20)->nullable();
            $table->string('status', 10)->default('waiting')->index();
            $table->string('counter', 30)->nullable();
            $table->timestamp('called_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['facility_id', 'queue_date', 'number']);
            $table->index(['facility_id', 'queue_date', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('queue_tickets');
        Schema::table('facilities', function (Blueprint $table): void {
            $table->dropColumn(['booking_max_active', 'booking_cancel_cutoff_hours', 'booking_min_notice_hours', 'check_reminded_at']);
        });
    }
};
