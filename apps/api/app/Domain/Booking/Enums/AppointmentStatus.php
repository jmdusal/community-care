<?php

namespace App\Domain\Booking\Enums;

/** requested → confirmed → completed | no_show; requested → declined; requested|confirmed → cancelled. */
enum AppointmentStatus: string
{
    case Requested = 'requested';
    case Confirmed = 'confirmed';
    case Declined = 'declined';
    case Cancelled = 'cancelled';
    case Completed = 'completed';
    case NoShow = 'no_show';

    /** Statuses that hold a seat in the slot. */
    public function holdsSeat(): bool
    {
        return in_array($this, [self::Requested, self::Confirmed], true);
    }

    public function isFinal(): bool
    {
        return ! $this->holdsSeat();
    }

    /** @return list<self> */
    public function allowedNext(): array
    {
        return match ($this) {
            self::Requested => [self::Confirmed, self::Declined, self::Cancelled],
            self::Confirmed => [self::Completed, self::NoShow, self::Cancelled],
            default => [],
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Requested => 'Waiting for the clinic',
            self::Confirmed => 'Confirmed',
            self::Declined => 'Declined by the clinic',
            self::Cancelled => 'Cancelled',
            self::Completed => 'Completed',
            self::NoShow => 'Missed',
        };
    }
}
