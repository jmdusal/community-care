<?php

namespace Database\Seeders;

use App\Domain\Facilities\Models\FacilityType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Starter catalog. Imports add any type they find, so this list is a baseline, not a limit.
 */
final class FacilityTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            'Barangay Health Station' => 'Community-level primary care point.',
            'Rural Health Unit' => 'Municipal primary care facility.',
            'Health Center' => 'City or municipal health center.',
            'Hospital' => 'Inpatient and specialist care.',
            'Infirmary' => 'Small inpatient facility for basic care.',
            'Birthing Home' => 'Facility for normal deliveries.',
            'Clinic' => 'Outpatient clinic.',
            'Laboratory' => 'Diagnostic laboratory.',
        ];

        foreach ($types as $name => $description) {
            FacilityType::query()->updateOrCreate(['slug' => Str::slug($name)], ['name' => $name, 'description' => $description]);
        }
    }
}
