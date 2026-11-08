<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /*
         * Appointments can now be made by guests (no account, verified by an email code) and by
         * staff for walk-in or phone callers. Each appointment keeps a copy of who it is for, so
         * it survives the patient deleting their account.
         */
        Schema::table('appointments', function (Blueprint $table): void {
            $table->dropForeign(['patient_id']);
        });

        Schema::table('appointments', function (Blueprint $table): void {
            $table->foreignId('patient_id')->nullable()->change();
            $table->foreign('patient_id')->references('id')->on('users')->nullOnDelete();
            $table->string('contact_name', 120)->nullable()->after('patient_id');
            $table->string('contact_email')->nullable()->after('contact_name');
            $table->string('contact_mobile', 20)->nullable()->after('contact_email');
            // online (signed-in patient) | guest (email-verified, no account) | staff (booked at the clinic)
            $table->string('source', 10)->default('online')->after('status');
            $table->foreignId('booked_by')->nullable()->after('source')->constrained('users')->nullOnDelete();
            $table->timestamp('reminded_at')->nullable()->after('status_reason');

            $table->index('contact_email');
            $table->index(['status', 'starts_at']);
        });

        DB::table('appointments')->whereNotNull('patient_id')->orderBy('id')->each(function (object $row): void {
            $user = DB::table('users')->where('id', $row->patient_id)->first(['name', 'email', 'mobile']);
            if ($user !== null) {
                DB::table('appointments')->where('id', $row->id)->update(['contact_name' => $user->name, 'contact_email' => $user->email, 'contact_mobile' => $user->mobile]);
            }
        });

        // Catalog items are archived rather than deleted while facilities still list them.
        foreach (['services', 'facility_types'] as $catalog) {
            Schema::table($catalog, function (Blueprint $table): void {
                $table->timestamp('archived_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (['services', 'facility_types'] as $catalog) {
            Schema::table($catalog, function (Blueprint $table): void {
                $table->dropColumn('archived_at');
            });
        }

        Schema::table('appointments', function (Blueprint $table): void {
            $table->dropIndex(['status', 'starts_at']);
            $table->dropIndex(['contact_email']);
            $table->dropConstrainedForeignId('booked_by');
            $table->dropColumn(['contact_name', 'contact_email', 'contact_mobile', 'source', 'reminded_at']);
        });
    }
};
