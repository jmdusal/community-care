<?php

namespace App\Domain\Booking\Exceptions;

use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/** A booking rule stopped the request (409 conflict, message shown to the person). */
final class BookingUnavailable extends ConflictHttpException
{
    public static function bookingOff(): self
    {
        return new self('Online appointment requests are not available for this facility. Please call the facility.');
    }

    public static function slotFull(): self
    {
        return new self('That time is now full. Please choose another time.');
    }

    public static function slotClosed(): self
    {
        return new self('That time is no longer available. Please choose another time.');
    }

    public static function tooMany(int $limit): self
    {
        $what = $limit === 1 ? 'an upcoming appointment request' : "{$limit} upcoming appointment requests";

        return new self("You already have {$what}. Cancel one before requesting another.");
    }

    public static function alreadyBooked(): self
    {
        return new self('You already have an appointment at that time.');
    }

    public static function transition(string $from, string $to): self
    {
        return new self("An appointment that is {$from} cannot be changed to {$to}.");
    }

    public static function tooLateToCancel(int $hours): self
    {
        return new self("Appointments can be cancelled online until {$hours} hours before. Please call the facility.");
    }

    public static function slotHasBookings(): self
    {
        return new self('This time has active appointments. Decline or cancel them first.');
    }
}
