<?php

namespace App\Http\Controllers\Api\V1\Patient;

use App\Domain\Booking\Actions\ChangeAppointmentStatus;
use App\Domain\Booking\Actions\RequestAppointment;
use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Models\Appointment;
use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Http\Support\Paginated;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

/** A patient's own appointments. */
final class AppointmentController extends Controller
{
    private const RELATIONS = ['facility:id,public_id,name,address', 'service:id,slug,name', 'queueTicket:id,appointment_id,number,status'];

    public function index(Request $request): JsonResponse
    {
        $appointments = Appointment::query()
            ->with(self::RELATIONS)
            ->where('patient_id', $request->user()->id)
            ->orderByRaw('CASE WHEN starts_at >= ? THEN 0 ELSE 1 END', [now()])
            ->orderBy('starts_at')
            ->paginate(Paginated::perPage($request));

        return Paginated::response($appointments, AppointmentResource::class, $request);
    }

    /** POST /appointments with header Idempotency-Key: retries return the same appointment. */
    public function store(Request $request, RequestAppointment $requestAppointment): JsonResponse
    {
        $key = (string) $request->header('Idempotency-Key');
        if (preg_match('/^[A-Za-z0-9\-_]{8,64}$/', $key) !== 1) {
            throw ValidationException::withMessages(['idempotency_key' => ['Send an Idempotency-Key header (8–64 letters, digits, - or _).']]);
        }

        $input = $request->validate(['slot_id' => ['required', 'string', 'size:26']]);

        [$appointment, $created] = $requestAppointment->handle($request->user(), $input['slot_id'], $key);

        return response()->json(['data' => new AppointmentResource($appointment->load(self::RELATIONS))], $created ? 201 : 200);
    }

    public function show(Appointment $appointment): JsonResponse
    {
        Gate::authorize('view', $appointment);

        return response()->json(['data' => new AppointmentResource($appointment->load([...self::RELATIONS, 'events']))]);
    }

    public function cancel(Request $request, Appointment $appointment, ChangeAppointmentStatus $change): JsonResponse
    {
        Gate::authorize('cancelAsPatient', $appointment);

        $updated = $change->handle($appointment, AppointmentStatus::Cancelled, $request->user(), 'Cancelled by the patient', byPatient: true);

        return response()->json(['data' => new AppointmentResource($updated->load(self::RELATIONS))]);
    }
}
