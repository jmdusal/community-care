<?php

namespace App\Domain\Booking;

use App\Domain\Booking\Events\AppointmentRequested;
use App\Domain\Booking\Events\AppointmentStatusChanged;
use App\Domain\Booking\Listeners\SendAppointmentEmails;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Policies\AppointmentPolicy;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

final class BookingServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::policy(Appointment::class, AppointmentPolicy::class);

        // Appointment lists (limited to assigned facilities for assigned-facility roles).
        Gate::define('view-appointments', fn (User $user) => $user->isActive() && $user->hasPermission(Permission::AppointmentsManage));

        // Slots and bookings of one facility.
        Gate::define('manage-schedule', fn (User $user, Facility $facility) => $user->isActive() && $user->canAt(Permission::AppointmentsManage, $facility));

        // Opting a facility into the pilot (without a facility: may do it for every facility).
        Gate::define('enable-booking', fn (User $user, ?Facility $facility = null) => $user->isActive()
            && ($facility === null ? $user->hasPermissionEverywhere(Permission::BookingEnable) : $user->canAt(Permission::BookingEnable, $facility)));

        Event::listen(AppointmentRequested::class, [SendAppointmentEmails::class, 'handleRequested']);
        Event::listen(AppointmentStatusChanged::class, [SendAppointmentEmails::class, 'handleStatusChanged']);
    }
}
