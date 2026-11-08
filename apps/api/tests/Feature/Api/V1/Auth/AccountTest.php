<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class AccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_people_update_their_name_and_mobile(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::Patient));

        $this->patchJson('/api/v1/me', ['name' => 'Juana Cruz', 'mobile' => '0917-555-1234'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Juana Cruz')
            ->assertJsonPath('data.mobile', '+639175551234');

        $this->patchJson('/api/v1/me', ['mobile' => '12345'])->assertUnprocessable()->assertJsonValidationErrors(['mobile'], 'error.fields');
    }

    public function test_changing_the_password_needs_the_current_one_and_signs_out_other_devices(): void
    {
        $user = $this->userWithRole(RoleName::Patient, ['password' => 'secret123']);
        $user->createToken('old-phone');
        $current = $user->createToken('this-phone');
        $this->withToken($current->plainTextToken);

        $this->putJson('/api/v1/me/password', ['current_password' => 'wrong123', 'password' => 'newpass99', 'password_confirmation' => 'newpass99'])
            ->assertUnprocessable()->assertJsonValidationErrors(['current_password'], 'error.fields');

        $this->putJson('/api/v1/me/password', ['current_password' => 'secret123', 'password' => 'newpass99', 'password_confirmation' => 'newpass99'])->assertNoContent();

        $this->assertTrue(Hash::check('newpass99', $user->refresh()->password));
        $this->assertSame(['this-phone'], $user->tokens()->pluck('name')->all());
    }

    public function test_patients_delete_their_account_and_upcoming_appointments_are_cancelled(): void
    {
        Notification::fake();
        $patient = $this->userWithRole(RoleName::Patient, ['password' => 'secret123', 'mobile' => '+639171234567']);
        $facility = Facility::factory()->published()->create();
        $slot = ClinicAvailability::query()->create(['facility_id' => $facility->id, 'starts_at' => now()->addDays(3), 'ends_at' => now()->addDays(3)->addMinutes(30), 'capacity' => 2, 'booked_count' => 1]);
        $appointment = Appointment::query()->create([
            'reference_code' => 'CC-AAAA-BBBB', 'patient_id' => $patient->id, 'contact_name' => $patient->name, 'contact_email' => $patient->email, 'contact_mobile' => $patient->mobile,
            'facility_id' => $facility->id, 'availability_id' => $slot->id, 'starts_at' => $slot->starts_at, 'ends_at' => $slot->ends_at,
            'status' => AppointmentStatus::Confirmed, 'idempotency_key' => 'delete-account-key',
        ]);
        Sanctum::actingAs($patient);

        $this->deleteJson('/api/v1/me', ['password' => 'nope'])->assertUnprocessable();
        $this->deleteJson('/api/v1/me', ['password' => 'secret123'])->assertNoContent();

        $this->assertModelMissing($patient);
        $appointment->refresh();
        $this->assertSame(AppointmentStatus::Cancelled, $appointment->status);
        $this->assertNull($appointment->patient_id);
        $this->assertNull($appointment->contact_email);
        $this->assertSame($patient->name, $appointment->contact_name);
        $this->assertSame(0, $slot->refresh()->booked_count);
    }

    public function test_staff_accounts_cannot_be_deleted_by_their_owner(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::FacilityStaff, ['password' => 'secret123']));

        $this->deleteJson('/api/v1/me', ['password' => 'secret123'])->assertConflict();
        $this->assertSame(1, User::query()->count());
    }
}
