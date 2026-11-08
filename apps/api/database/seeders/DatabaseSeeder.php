<?php

namespace Database\Seeders;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\App;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            SuperAdminSeeder::class,
            FacilityTypeSeeder::class,
            ServiceSeeder::class,
            GeographySeeder::class,
        ]);

        if (App::environment('local')) {
            $this->seedLocalVerifier();
            $this->seedLocalFacilityAdmin();
            $this->call(SampleKnowledgeDocumentSeeder::class);
        }
    }

    /** A second, non-admin account for trying role-based screens locally. */
    private function seedLocalVerifier(): void
    {
        $user = User::query()->firstOrCreate(
            ['email' => 'verifier@communitycare.test'],
            ['name' => 'Local Verifier', 'password' => 'password', 'email_verified_at' => now()],
        );

        $user->roles()->syncWithoutDetaching([Role::query()->where('name', RoleName::Verifier->value)->value('id')]);
    }

    /** A facility admin for trying the role locally, assigned to the first published facility. */
    private function seedLocalFacilityAdmin(): void
    {
        $user = User::query()->firstOrCreate(
            ['email' => 'facility-admin@communitycare.test'],
            ['name' => 'Ana Reyes', 'password' => 'password', 'email_verified_at' => now()],
        );

        $user->roles()->syncWithoutDetaching([Role::query()->where('name', RoleName::FacilityAdmin->value)->value('id')]);

        $facility = Facility::query()->where('publication_status', 'published')->orderBy('name')->first();
        if ($facility !== null && $user->facilities()->doesntExist()) {
            $user->facilities()->attach($facility->id, ['assigned_at' => now()]);
        }
    }
}
