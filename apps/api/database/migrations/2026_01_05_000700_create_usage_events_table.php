<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Anonymous usage counts for the success measures. No user id, no raw IP:
     * visitor_hash is a daily-rotating hash, query_hash a hash of the search text.
     */
    public function up(): void
    {
        Schema::create('usage_events', function (Blueprint $table) {
            $table->id();
            $table->string('event', 30);
            $table->foreignId('facility_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('region_id')->nullable()->constrained()->nullOnDelete();
            $table->char('query_hash', 64)->nullable();
            $table->char('visitor_hash', 64)->nullable();
            $table->unsignedInteger('result_count')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['event', 'created_at']);
            $table->index(['facility_id', 'event']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usage_events');
    }
};
