<?php

namespace App\Domain\Booking\Support;

use App\Domain\Booking\Data\AppointmentContact;
use App\Domain\Booking\Notifications\GuestBookingCodeNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

/**
 * Guest booking without an account: the guest's details and chosen slot wait here until
 * they type the 6-digit code we emailed them. The code is stored only as a keyed hash,
 * expires after 10 minutes and allows 5 wrong tries. Proving the email stops strangers
 * from booking seats in someone else's name.
 */
final class GuestVerifications
{
    public const MINUTES = 10;

    private const MAX_ATTEMPTS = 5;

    /** @return string the verification id the browser sends back with the code */
    public function start(AppointmentContact $contact, string $slotPublicId, string $facilityName): string
    {
        $id = Str::lower((string) Str::ulid());
        $code = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);

        Cache::put($this->key($id), [
            'slot_id' => $slotPublicId,
            'name' => $contact->name,
            'email' => $contact->email,
            'mobile' => $contact->mobile,
            'hash' => $this->hash($code),
            'attempts' => 0,
        ], now()->addMinutes(self::MINUTES));

        Notification::route('mail', (string) $contact->email)->notifyNow(new GuestBookingCodeNotification($code, $facilityName, self::MINUTES));

        return $id;
    }

    /**
     * The pending booking when the code is right, otherwise null. A right code can be sent
     * again (a retry after a dropped connection) until the entry expires.
     *
     * @return array{slot_id: string, contact: AppointmentContact}|null
     */
    public function check(string $id, string $code): ?array
    {
        $stored = Cache::get($this->key($id));
        if (! is_array($stored)) {
            return null;
        }

        if (! hash_equals($stored['hash'], $this->hash(preg_replace('/\s+/', '', $code) ?? ''))) {
            $stored['attempts']++;
            $stored['attempts'] >= self::MAX_ATTEMPTS ? Cache::forget($this->key($id)) : Cache::put($this->key($id), $stored, now()->addMinutes(self::MINUTES));

            return null;
        }

        return ['slot_id' => $stored['slot_id'], 'contact' => new AppointmentContact($stored['name'], $stored['email'], $stored['mobile'])];
    }

    private function key(string $id): string
    {
        return "guest_booking:{$id}";
    }

    private function hash(string $code): string
    {
        return hash_hmac('sha256', $code, (string) config('app.key'));
    }
}
