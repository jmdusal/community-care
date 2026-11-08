<?php

namespace App\Domain\Booking\Policies;

use App\Domain\Booking\Models\Appointment;
use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Models\User;

/**
 * Patients see their own appointments. Staff of the facility (and system admins)
 * manage them. Verifiers do not get patient details by default.
 */
final class AppointmentPolicy
{
    public function view(User $user, Appointment $appointment): bool
    {
        return $user->isActive() && ($appointment->patient_id === $user->id || $this->manage($user, $appointment));
    }

    public function cancelAsPatient(User $user, Appointment $appointment): bool
    {
        return $user->isActive() && $appointment->patient_id === $user->id;
    }

    public function manage(User $user, Appointment $appointment): bool
    {
        return $user->isActive() && $user->canAt(Permission::AppointmentsManage, $appointment->facility);
    }
}
