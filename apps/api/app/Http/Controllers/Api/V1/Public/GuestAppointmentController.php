<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Domain\Booking\Actions\ChangeAppointmentStatus;
use App\Domain\Booking\Actions\RequestAppointment;
use App\Domain\Booking\Data\AppointmentContact;
use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Exceptions\BookingUnavailable;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Booking\Support\BookingRules;
use App\Domain\Booking\Support\GuestVerifications;
use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Identity\TwoFactor\EmailCodes;
use App\Domain\Settings\Contracts\SettingsRepository;
use App\Http\Controllers\Controller;
use App\Http\Requests\Public\GuestAppointmentRequest;
use App\Http\Resources\AppointmentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Appointments without an account:
 * 1. POST /appointments/guest: details + slot; we email a 6-digit code.
 * 2. POST /appointments/guest/verify: the code; the request is sent to the clinic.
 * 3. POST /appointments/lookup (and /lookup/cancel): reference code + email to check or cancel.
 */
final class GuestAppointmentController extends Controller
{
    private const RELATIONS = ['facility:id,public_id,name,address', 'service:id,slug,name', 'events', 'queueTicket:id,appointment_id,number,status'];

    public function __construct(private readonly SettingsRepository $settings) {}

    public function start(GuestAppointmentRequest $request, GuestVerifications $verifications): JsonResponse
    {
        $slot = ClinicAvailability::query()->with('facility')->where('public_id', $request->validated('slot_id'))->first();
        if ($slot === null) {
            throw new NotFoundHttpException;
        }
        // Check early so nobody types a code for a time they cannot get (checked again when booking).
        if (! $this->settings->bool('features.booking.enabled') || ! $slot->facility->booking_enabled || $slot->facility->publication_status !== PublicationStatus::Published) {
            throw BookingUnavailable::bookingOff();
        }
        $rules = app(BookingRules::class);
        if ($slot->status !== ClinicAvailability::OPEN || $slot->starts_at->lt($rules->earliestStart($slot->facility)) || $rules->isClosedOn($slot->facility, $slot->starts_at)) {
            throw BookingUnavailable::slotClosed();
        }
        if ($slot->seatsLeft() === 0) {
            throw BookingUnavailable::slotFull();
        }

        $contact = AppointmentContact::fromInput($request->validated());
        $id = $verifications->start($contact, $slot->public_id, $slot->facility->name);

        return response()->json(['data' => [
            'verification_id' => $id,
            'sent_to' => EmailCodes::mask((string) $contact->email),
            'expires_in_minutes' => GuestVerifications::MINUTES,
        ]], 202);
    }

    public function verify(Request $request, GuestVerifications $verifications, RequestAppointment $requestAppointment): JsonResponse
    {
        $input = $request->validate([
            'verification_id' => ['required', 'string', 'size:26'],
            'code' => ['required', 'string', 'max:12'],
        ]);

        $pending = $verifications->check($input['verification_id'], $input['code']);
        if ($pending === null) {
            throw ValidationException::withMessages(['code' => ['That code is not right or has expired. Check the latest email, or start again.']]);
        }

        [$appointment, $created] = $requestAppointment->forGuest($pending['contact'], $pending['slot_id'], $input['verification_id']);

        return response()->json(['data' => new AppointmentResource($appointment->load(self::RELATIONS))], $created ? 201 : 200);
    }

    public function lookup(Request $request): JsonResponse
    {
        return response()->json(['data' => new AppointmentResource($this->find($request)->load(self::RELATIONS))]);
    }

    public function cancel(Request $request, ChangeAppointmentStatus $change): JsonResponse
    {
        $appointment = $this->find($request);
        $updated = $change->handle($appointment, AppointmentStatus::Cancelled, null, 'Cancelled by the patient', byPatient: true);

        return response()->json(['data' => new AppointmentResource($updated->load(self::RELATIONS))]);
    }

    /** Both must match; the answer is the same "not found" either way, so codes cannot be probed. */
    private function find(Request $request): Appointment
    {
        $input = $request->validate([
            'reference_code' => ['required', 'string', 'max:20'],
            'email' => ['required', 'email', 'max:255'],
        ]);

        $code = mb_strtoupper(trim($input['reference_code']));
        $code = str_starts_with($code, 'CC-') ? $code : 'CC-'.$code;

        return Appointment::query()
            ->where('reference_code', $code)
            ->where('contact_email', mb_strtolower(trim($input['email'])))
            ->first() ?? throw new NotFoundHttpException('No appointment matches that reference code and email.');
    }
}
