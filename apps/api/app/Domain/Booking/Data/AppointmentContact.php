<?php

namespace App\Domain\Booking\Data;

use App\Domain\Identity\Models\User;

/** Who an appointment is for: name plus at least one way for the clinic to reach them. */
final readonly class AppointmentContact
{
    public function __construct(
        public string $name,
        public ?string $email,
        public ?string $mobile,
    ) {}

    public static function fromUser(User $user): self
    {
        return new self($user->name, $user->email, $user->mobile);
    }

    /** @param array{name: string, email?: string|null, mobile?: string|null} $input */
    public static function fromInput(array $input): self
    {
        $email = trim((string) ($input['email'] ?? ''));
        $mobile = trim((string) ($input['mobile'] ?? ''));

        return new self(trim($input['name']), $email === '' ? null : mb_strtolower($email), $mobile === '' ? null : $mobile);
    }

    /** @return array{contact_name: string, contact_email: string|null, contact_mobile: string|null} */
    public function toAttributes(): array
    {
        return ['contact_name' => $this->name, 'contact_email' => $this->email, 'contact_mobile' => $this->mobile];
    }
}
