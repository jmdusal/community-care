<?php

namespace App\Domain\Booking\Actions;

use App\Domain\Booking\Exceptions\BookingUnavailable;
use App\Domain\Booking\Models\ClinicAvailability;
use Illuminate\Support\Facades\DB;

/** Closes a slot. Refused while it holds requested or confirmed appointments. */
final class CancelAvailability
{
    public function handle(ClinicAvailability $slot): void
    {
        DB::transaction(function () use ($slot): void {
            $locked = ClinicAvailability::query()->whereKey($slot->id)->lockForUpdate()->firstOrFail();

            if ($locked->booked_count > 0) {
                throw BookingUnavailable::slotHasBookings();
            }

            $locked->update(['status' => ClinicAvailability::CANCELLED]);
        });
    }
}
