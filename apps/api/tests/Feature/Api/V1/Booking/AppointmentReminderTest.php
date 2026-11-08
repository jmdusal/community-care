<?php

namespace Tests\Feature\Api\V1\Booking;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Booking\Notifications\AppointmentNotification;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use App\Domain\Shared\Notifications\InAppNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

final class AppointmentReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_confirmed_appointments_in_the_next_day_are_reminded_once(): void
    {
        Notification::fake();
        $facility = Facility::factory()->published()->create(['name' => 'Pilot Health Center']);
        $patient = $this->userWithRole(RoleName::Patient);

        $tomorrow = $this->appointment($facility, AppointmentStatus::Confirmed, 20, $patient);
        $guest = $this->appointment($facility, AppointmentStatus::Confirmed, 22, null, 'guest@example.org');
        $this->appointment($facility, AppointmentStatus::Requested, 20, $patient);
        $this->appointment($facility, AppointmentStatus::Confirmed, 50, $patient);

        $this->artisan('communitycare:send-reminders')->expectsOutput('2 appointment reminders sent.')->assertSuccessful();
        $this->artisan('communitycare:send-reminders')->expectsOutput('0 appointment reminders sent.')->assertSuccessful();

        $this->assertNotNull($tomorrow->refresh()->reminded_at);
        $this->assertNotNull($guest->refresh()->reminded_at);
        Notification::assertSentTo($patient, AppointmentNotification::class, fn (AppointmentNotification $n) => str_starts_with($n->subjectLine, 'Reminder: Pilot Health Center'));
        Notification::assertSentTo($patient, InAppNotification::class);
        Notification::assertSentOnDemand(AppointmentNotification::class, fn (AppointmentNotification $n, array $c, AnonymousNotifiable $to) => $to->routes['mail'] === 'guest@example.org');
        Notification::assertSentTimes(AppointmentNotification::class, 1 + 1);
    }

    private function appointment(Facility $facility, AppointmentStatus $status, int $inHours, ?User $patient, ?string $email = null): Appointment
    {
        $slot = ClinicAvailability::query()->create(['facility_id' => $facility->id, 'starts_at' => now()->addHours($inHours), 'ends_at' => now()->addHours($inHours)->addMinutes(30), 'capacity' => 5]);

        return Appointment::query()->create([
            'reference_code' => 'CC-'.strtoupper(substr(md5((string) random_int(0, PHP_INT_MAX)), 0, 4)).'-TEST',
            'patient_id' => $patient?->id,
            'contact_name' => $patient?->name ?? 'Guest',
            'contact_email' => $email ?? $patient?->email,
            'facility_id' => $facility->id,
            'availability_id' => $slot->id,
            'starts_at' => $slot->starts_at,
            'ends_at' => $slot->ends_at,
            'status' => $status,
            'source' => $patient === null ? 'guest' : 'online',
            'idempotency_key' => (string) random_int(10_000_000, 99_999_999),
        ]);
    }
}
