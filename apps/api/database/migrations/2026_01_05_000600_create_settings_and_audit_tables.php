<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Data-driven configuration. Types, defaults and validation live in SettingsSchema;
        // a missing row means "use the default".
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key', 120)->primary();
            $table->json('value');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Written only by the queued WriteAuditLog listener. event_key makes writes idempotent.
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('event_key', 191)->unique();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 100)->index();
            $table->string('resource_type', 60);
            $table->string('resource_id', 191)->nullable();
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->string('ip_masked', 64)->nullable();
            $table->string('request_id', 64)->nullable();
            $table->timestamp('created_at')->useCurrent()->index();

            $table->index(['resource_type', 'resource_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('settings');
    }
};
