<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PSGC hierarchy. Codes are the 10-digit PSGC; psgc_release records which
     * PSA release a row last came from.
     */
    public function up(): void
    {
        Schema::create('regions', function (Blueprint $table) {
            $table->id();
            $table->char('psgc_code', 10)->unique();
            $table->string('name');
            $table->string('psgc_release', 20)->nullable();
            $table->timestamps();
        });

        Schema::create('provinces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('region_id')->constrained()->cascadeOnDelete();
            $table->char('psgc_code', 10)->unique();
            $table->string('name');
            $table->boolean('is_district')->default(false);
            $table->string('psgc_release', 20)->nullable();
            $table->timestamps();
        });

        Schema::create('cities_municipalities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('region_id')->constrained()->cascadeOnDelete();
            $table->foreignId('province_id')->nullable()->constrained()->nullOnDelete();
            $table->char('psgc_code', 10)->unique();
            $table->string('name');
            $table->string('kind', 20);
            $table->string('psgc_release', 20)->nullable();
            $table->timestamps();
        });

        Schema::create('barangays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('city_municipality_id')->constrained('cities_municipalities')->cascadeOnDelete();
            $table->char('psgc_code', 10)->unique();
            $table->string('name');
            $table->string('psgc_release', 20)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barangays');
        Schema::dropIfExists('cities_municipalities');
        Schema::dropIfExists('provinces');
        Schema::dropIfExists('regions');
    }
};
