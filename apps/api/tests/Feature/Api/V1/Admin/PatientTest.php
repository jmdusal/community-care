<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class PatientTest extends TestCase
{
    use RefreshDatabase;

    public function test_system_admins_see_every_patient_and_can_suspend_one(): void
    {
        $juana = $this->userWithRole(RoleName::Patient, ['name' => 'Juana Cruz']);
        $this->userWithRole(RoleName::Patient, ['name' => 'Pedro Reyes']);
        $this->userWithRole(RoleName::FacilityStaff, ['name' => 'Staff Person']);
        $juana->createToken('phone');
        Sanctum::actingAs($this->userWithRole(RoleName::SystemAdmin));

        $this->getJson('/api/v1/admin/patients')->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('meta.can_manage', true);
        $this->getJson('/api/v1/admin/patients?q=juana')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $juana->public_id);

        $this->patchJson("/api/v1/admin/patients/{$juana->public_id}/status", ['status' => 'suspended'])->assertOk()->assertJsonPath('data.status', 'suspended');
        $this->assertSame(0, $juana->tokens()->count());
    }

    public function test_facility_staff_only_see_patients_and_appointments_of_their_facilities(): void
    {
        $mine = Facility::factory()->published()->create();
        $other = Facility::factory()->published()->create();
        $staff = $this->userWithRole(RoleName::FacilityStaff);
        $mine->staff()->attach($staff);

        $both = $this->userWithRole(RoleName::Patient, ['name' => 'Both Places']);
        $elsewhere = $this->userWithRole(RoleName::Patient, ['name' => 'Elsewhere Only']);
        $this->appointment($both, $mine);
        $this->appointment($both, $other);
        $this->appointment($elsewhere, $other);
        Sanctum::actingAs($staff);

        $this->getJson('/api/v1/admin/patients')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.appointments', 1)->assertJsonPath('meta.can_manage', false);
        $this->getJson("/api/v1/admin/patients/{$both->public_id}")->assertOk()->assertJsonCount(1, 'data.appointments')->assertJsonPath('data.appointments.0.facility.id', $mine->public_id);
        $this->getJson("/api/v1/admin/patients/{$elsewhere->public_id}")->assertNotFound();
        $this->patchJson("/api/v1/admin/patients/{$both->public_id}/status", ['status' => 'suspended'])->assertForbidden();
    }

    public function test_verifiers_do_not_get_patient_details(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::Verifier));

        $this->getJson('/api/v1/admin/patients')->assertForbidden();
    }

    private function appointment(User $patient, Facility $facility): void
    {
        $slot = ClinicAvailability::query()->create(['facility_id' => $facility->id, 'starts_at' => now()->addDay(), 'ends_at' => now()->addDay()->addMinutes(30), 'capacity' => 5]);
        Appointment::query()->create([
            'reference_code' => 'CC-'.strtoupper(substr(md5(uniqid()), 0, 4)).'-'.strtoupper(substr(md5(uniqid('', true)), 0, 4)),
            'patient_id' => $patient->id, 'contact_name' => $patient->name, 'facility_id' => $facility->id, 'availability_id' => $slot->id,
            'starts_at' => $slot->starts_at, 'ends_at' => $slot->ends_at, 'status' => AppointmentStatus::Requested, 'idempotency_key' => uniqid('k', true),
        ]);
    }
}
