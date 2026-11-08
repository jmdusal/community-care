<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // "Today at this facility": one row per facility per (Philippine) day; only today's is shown.
        Schema::create('facility_day_statuses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->date('status_date');
            $table->string('doctor', 10)->nullable();        // in | out
            $table->string('opening', 15)->nullable();       // open | closing_early | closed
            $table->time('closes_at')->nullable();           // when closing early
            $table->json('out_of_stock')->nullable();        // short item names, e.g. ["BCG vaccine"]
            $table->string('note', 160)->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['facility_id', 'status_date']);
        });

        // "Report wrong information" from the public (no account needed).
        Schema::create('facility_reports', function (Blueprint $table): void {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->string('reason', 30);
            $table->string('details', 500)->nullable();
            $table->string('contact', 120)->nullable();
            $table->string('status', 12)->default('open')->index();
            $table->string('resolution_note', 300)->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->char('reporter_hash', 64)->nullable();
            $table->timestamps();

            $table->index(['facility_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facility_reports');
        Schema::dropIfExists('facility_day_statuses');
    }
};
