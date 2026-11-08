<?php

use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Enums\RoleName;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Roles become editable: a label, where they apply (all facilities or assigned ones),
     * which permissions they grant, and whether two-factor sign-in is required.
     */
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table): void {
            $table->string('label', 60)->nullable()->after('name');
            // Null on a built-in role = its code default (RoleName).
            $table->string('scope', 10)->nullable()->after('description');
            $table->json('permissions')->nullable()->after('scope');
            $table->boolean('requires_two_factor')->nullable()->after('permissions');
        });

        foreach (RoleName::cases() as $role) {
            DB::table('roles')->updateOrInsert(['name' => $role->value], [
                'label' => $role->label(),
                'description' => $role->description(),
                'scope' => $role->scope()->value,
                'permissions' => json_encode(array_map(fn (Permission $p) => $p->value, $role->defaultPermissions())),
                'requires_two_factor' => $role->requiresTwoFactor(),
                'updated_at' => now(),
            ]);
        }
        DB::table('roles')->whereNull('created_at')->update(['created_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table): void {
            $table->dropColumn(['label', 'scope', 'permissions', 'requires_two_factor']);
        });
    }
};
