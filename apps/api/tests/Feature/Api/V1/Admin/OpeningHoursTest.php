<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class OpeningHoursTest extends TestCase
{
    use RefreshDatabase;

    public function test_24_hour_overnight_and_special_days_are_saved_and_shown(): void
    {
        $facility = Facility::factory()->published()->create();
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));
        $tomorrow = now('Asia/Manila')->addDay()->toDateString();
        $nextWeek = now('Asia/Manila')->addWeek()->toDateString();

        $this->patchJson("/api/v1/admin/facilities/{$facility->public_id}", [
            'hours' => [
                ['day_of_week' => 1, 'opens_at' => '00:00', 'closes_at' => '24:00'],
                ['day_of_week' => 2, 'opens_at' => '22:00', 'closes_at' => '06:00'],
            ],
            'hour_exceptions' => [
                ['date' => $tomorrow, 'is_closed' => true, 'reason' => 'Holiday'],
                ['date' => $nextWeek, 'is_closed' => false, 'opens_at' => '08:00', 'closes_at' => '12:00', 'reason' => 'Half day'],
            ],
        ])->assertOk();

        $this->getJson("/api/v1/facilities/{$facility->public_id}")
            ->assertOk()
            ->assertJsonFragment(['day_of_week' => 1, 'opens_at' => '00:00', 'closes_at' => '24:00'])
            ->assertJsonFragment(['day_of_week' => 2, 'opens_at' => '22:00', 'closes_at' => '06:00'])
            ->assertJsonPath('data.hour_exceptions.0.date', $tomorrow)
            ->assertJsonPath('data.hour_exceptions.0.is_closed', true)
            ->assertJsonPath('data.hour_exceptions.1.opens_at', '08:00');

        $this->getJson("/api/v1/admin/facilities/{$facility->public_id}")
            ->assertJsonPath('data.current.hour_exceptions.1.reason', 'Half day');
    }

    public function test_bad_hours_are_refused_with_clear_messages(): void
    {
        $facility = Facility::factory()->published()->create();
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));

        $this->patchJson("/api/v1/admin/facilities/{$facility->public_id}", [
            'hours' => [['day_of_week' => 1, 'opens_at' => '08:00', 'closes_at' => '08:00']],
        ])->assertUnprocessable()->assertJsonValidationErrors(['hours.0.closes_at'], 'error.fields');

        $this->patchJson("/api/v1/admin/facilities/{$facility->public_id}", [
            'hour_exceptions' => [['date' => now()->subDays(3)->toDateString(), 'is_closed' => true]],
        ])->assertUnprocessable()->assertJsonValidationErrors(['hour_exceptions.0.date'], 'error.fields');

        $this->patchJson("/api/v1/admin/facilities/{$facility->public_id}", [
            'hour_exceptions' => [['date' => now()->addDays(3)->toDateString(), 'is_closed' => false]],
        ])->assertUnprocessable()->assertJsonValidationErrors(['hour_exceptions.0.opens_at'], 'error.fields');
    }
}
