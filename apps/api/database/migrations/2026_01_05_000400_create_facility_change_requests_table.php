<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Every create or edit of a facility is a proposal. `changes` holds
     * field => {before, after}; another person must approve it (four-eyes).
     */
    public function up(): void
    {
        Schema::create('facility_change_requests', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('origin', 20);
            $table->json('changes');
            $table->string('note', 500)->nullable();
            $table->string('status', 20)->index();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('reason', 500)->nullable();
            $table->timestamps();

            $table->index(['facility_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facility_change_requests');
    }
};
