<?php

namespace Database\Factories;

use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Models\Facility;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Facility>
 */
class FacilityFactory extends Factory
{
    /** @var class-string<Facility> */
    protected $model = Facility::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'name' => fake()->randomElement(['Barangay', 'City', 'Rural']).' '.fake()->lastName().' Health Center',
            'address' => fake()->streetAddress(),
            'verification_status' => VerificationStatus::Draft,
            'publication_status' => PublicationStatus::Unpublished,
        ];
    }

    public function published(): static
    {
        return $this->state(fn (): array => [
            'verification_status' => VerificationStatus::Verified,
            'publication_status' => PublicationStatus::Published,
            'verified_at' => now(),
            'verification_method' => 'factory',
        ]);
    }
}
