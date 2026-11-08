<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Which facilities a facility-staff member may see and propose changes to. */
    public function up(): void
    {
        Schema::create('facility_user', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->useCurrent();

            $table->primary(['user_id', 'facility_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facility_user');
    }
};
