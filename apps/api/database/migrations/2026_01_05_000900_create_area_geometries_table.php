<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Map position and boundary of each PSGC area, looked up once from OpenStreetMap and cached.
        Schema::create('area_geometries', function (Blueprint $table): void {
            $table->id();
            $table->string('psgc_code', 10)->unique();
            $table->string('level', 20);
            $table->string('status', 20); // found | not_found
            $table->decimal('latitude', 9, 6)->nullable();
            $table->decimal('longitude', 9, 6)->nullable();
            $table->json('bbox')->nullable(); // [south, west, north, east]
            $table->longText('geojson')->nullable();
            $table->string('matched_name')->nullable();
            $table->string('source', 40);
            $table->timestamp('fetched_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('area_geometries');
    }
};
