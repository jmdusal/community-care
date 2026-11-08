<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Highly urbanized and independent component cities (Iligan, Cagayan de Oro, Cebu…)
     * belong to no province in PSGC, so province_id stays null. This records the
     * province they sit in geographically, for browsing and map look-ups only.
     */
    public function up(): void
    {
        Schema::table('cities_municipalities', function (Blueprint $table): void {
            $table->foreignId('geographic_province_id')->nullable()->after('province_id')->constrained('provinces')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cities_municipalities', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('geographic_province_id');
        });
    }
};
