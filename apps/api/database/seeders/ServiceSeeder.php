<?php

namespace Database\Seeders;

use App\Domain\Services\Models\Service;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Starter service catalog (data-driven: imports and admins can add more).
 */
final class ServiceSeeder extends Seeder
{
    public function run(): void
    {
        $services = [
            'Primary care' => 'general',
            'Immunization' => 'preventive',
            'Prenatal care' => 'maternal',
            'Normal delivery' => 'maternal',
            'Family planning' => 'maternal',
            'TB-DOTS' => 'infectious',
            'Animal bite treatment' => 'infectious',
            'Dental' => 'dental',
            'Laboratory' => 'diagnostic',
            'Emergency' => 'emergency',
            'Inpatient' => 'inpatient',
            'Nutrition' => 'preventive',
        ];

        foreach ($services as $name => $category) {
            Service::query()->updateOrCreate(['slug' => Str::slug($name)], ['name' => $name, 'category' => $category]);
        }
    }
}
