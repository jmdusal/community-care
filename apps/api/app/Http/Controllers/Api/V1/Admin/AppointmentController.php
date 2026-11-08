<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Booking\Actions\ChangeAppointmentStatus;
use App\Domain\Booking\Actions\RequestAppointment;
use App\Domain\Booking\Data\AppointmentContact;
use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Models\ClinicAvailability;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Http\Support\ConsoleScope;
use App\Http\Support\Paginated;
use App\Http\Support\PhilippineMobile;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Appointments for facility staff (their assigned facilities) and system admins.
 * Views: requests (waiting for the clinic), upcoming (confirmed), past (everything finished).
 */
final class AppointmentController extends Controller
{
    private const RELATIONS = ['facility:id,public_id,name,address', 'service:id,slug,name', 'patient:id,public_id,name,email,mobile', 'bookedBy:id,name', 'queueTicket:id,appointment_id,number,status'];

    private const ACTIONS = [
        'confirm' => AppointmentStatus::Confirmed,
        'decline' => AppointmentStatus::Declined,
        'cancel' => AppointmentStatus::Cancelled,
        'complete' => AppointmentStatus::Completed,
        'no-show' => AppointmentStatus::NoShow,
    ];

    public function index(Request $request): JsonResponse
    {
        Gate::authorize('view-appointments');
        $user = $request->user();

        $filters = $request->validate([
            'view' => ['nullable', Rule::in(['requests', 'upcoming', 'past'])],
            'facility_id' => ConsoleScope::FACILITY_RULE,
            'region_code' => ['nullable', 'digits:10'],
            'date' => ['nullable', 'date'],
            'q' => ['nullable', 'string', 'max:60'],
            'patient' => ['nullable', 'string', 'size:26'],
        ]);
        $view = $filters['view'] ?? 'requests';

        $scoped = $this->scope($user, $filters);

        $appointments = Appointment::query()
            ->with(self::RELATIONS)
            ->tap($scoped)
            ->tap(fn (Builder $q) => $this->applyView($q, $view))
            ->when($filters['date'] ?? null, fn (Builder $q, string $date) => $q->whereBetween('starts_at', [
                now()->parse($date, config('communitycare.display_timezone'))->startOfDay()->utc(),
                now()->parse($date, config('communitycare.display_timezone'))->endOfDay()->utc(),
            ]))
            ->when($filters['q'] ?? null, function (Builder $q, string $text): void {
                $like = '%'.addcslashes($text, '%_\\').'%';
                $q->where(fn (Builder $w) => $w
                    ->where('reference_code', 'like', $like)
                    ->orWhere('contact_name', 'like', $like)
                    ->orWhere('contact_mobile', 'like', $like)
                    ->orWhere('contact_email', 'like', $like));
            })
            ->orderBy('starts_at', $view === 'past' ? 'desc' : 'asc')
            ->paginate(Paginated::perPage($request, 25));

        $appointments->getCollection()->transform(fn (Appointment $appointment) => tap(new AppointmentResource($appointment), fn (AppointmentResource $r) => $r->forStaff = true));

        $counts = collect(['requests', 'upcoming', 'past'])->mapWithKeys(fn (string $name): array => [
            $name => Appointment::query()->tap($scoped)->tap(fn (Builder $q) => $this->applyView($q, $name))->count(),
        ]);

        return response()->json([
            'data' => $appointments->getCollection()->map(fn (AppointmentResource $r) => $r->resolve($request))->values(),
            'meta' => ['page' => $appointments->currentPage(), 'per_page' => $appointments->perPage(), 'total' => $appointments->total(), 'last_page' => $appointments->lastPage(), 'view' => $view, 'counts' => $counts],
        ]);
    }

    /**
     * POST /admin/facilities/{facility}/appointments (header Idempotency-Key): the clinic books a
     * walk-in or phone caller into one of its slots. Confirmed at once. Give a name and a mobile
     * or email, or pick an existing patient account (its details are used). An email that
     * belongs to a patient account links the appointment to that account.
     */
    public function store(Request $request, Facility $facility, RequestAppointment $requestAppointment): JsonResponse
    {
        Gate::authorize('manage-schedule', $facility);

        $key = (string) $request->header('Idempotency-Key');
        if (preg_match('/^[A-Za-z0-9\-_]{8,64}$/', $key) !== 1) {
            throw ValidationException::withMessages(['idempotency_key' => ['Send an Idempotency-Key header (8–64 letters, digits, - or _).']]);
        }

        $request->merge(['mobile' => PhilippineMobile::normalize($request->input('mobile'))]);
        $input = $request->validate([
            'slot_id' => ['required', 'string', 'size:26'],
            'patient' => ['nullable', 'string', 'size:26'],
            'name' => ['required_without:patient', 'nullable', 'string', 'min:2', 'max:120'],
            'mobile' => ['required_without_all:email,patient', 'nullable', PhilippineMobile::RULE],
            'email' => ['nullable', 'email', 'max:255'],
        ], ['mobile.regex' => PhilippineMobile::MESSAGE, 'mobile.required_without_all' => 'Give a mobile number or an email so the clinic can reach them.']);

        $slot = ClinicAvailability::query()->where('public_id', $input['slot_id'])->first();
        if ($slot === null || $slot->facility_id !== $facility->id) {
            throw ValidationException::withMessages(['slot_id' => ['Choose one of this facility\'s open times.']]);
        }

        $patients = fn () => User::query()->whereHas('roles', fn (Builder $q) => $q->where('name', RoleName::Patient->value));
        $patient = null;
        if (! empty($input['patient'])) {
            $patient = $patients()->where('public_id', $input['patient'])->first()
                ?? throw ValidationException::withMessages(['patient' => ['That patient account was not found.']]);
        } elseif (! empty($input['email'])) {
            // A caller who already has a patient account gets it in "My appointments" too.
            $patient = $patients()->where('email', mb_strtolower(trim($input['email'])))->first();
        }

        $contact = $patient !== null && empty($input['name'])
            ? AppointmentContact::fromUser($patient)
            : AppointmentContact::fromInput(['name' => (string) $input['name'], 'email' => $input['email'] ?? $patient?->email, 'mobile' => $input['mobile'] ?? $patient?->mobile]);

        [$appointment, $created] = $requestAppointment->byStaff($request->user(), $contact, $slot->public_id, $key, $patient);

        $resource = new AppointmentResource($appointment->load([...self::RELATIONS, 'events.actor:id,name']));
        $resource->forStaff = true;

        return response()->json(['data' => $resource->resolve($request)], $created ? 201 : 200);
    }

    /**
     * GET /admin/appointments/calendar?month=2026-11: every appointment in a month (Philippine
     * dates), for the calendar. Same access and top-bar scope as the lists; at most 1,000.
     */
    public function calendar(Request $request): JsonResponse
    {
        Gate::authorize('view-appointments');
        $filters = $request->validate([
            'month' => ['required', 'date_format:Y-m'],
            'facility_id' => ConsoleScope::FACILITY_RULE,
            'region_code' => ['nullable', 'digits:10'],
        ]);

        $tz = (string) config('communitycare.display_timezone');
        $start = now()->parse("{$filters['month']}-01", $tz)->startOfMonth();
        $end = $start->copy()->endOfMonth();

        $appointments = Appointment::query()
            ->with(self::RELATIONS)
            ->tap($this->scope($request->user(), $filters))
            ->whereBetween('starts_at', [$start->copy()->utc(), $end->copy()->utc()])
            ->orderBy('starts_at')
            ->limit(1000)
            ->get();

        return response()->json([
            'data' => $appointments->map(fn (Appointment $appointment) => tap(new AppointmentResource($appointment), fn (AppointmentResource $r) => $r->forStaff = true)->resolve($request))->values(),
            'meta' => ['month' => $filters['month'], 'total' => $appointments->count(), 'truncated' => $appointments->count() === 1000],
        ]);
    }

    /**
     * Limits appointments to what this person may see and the top-bar scope.
     *
     * @param  array<string, mixed>  $filters
     * @return callable(Builder<Appointment>): mixed
     */
    private function scope(User $user, array $filters): callable
    {
        return fn (Builder $q) => $q
            ->unless($user->seesAllFacilities(), fn (Builder $q) => $q->whereHas('facility.staff', fn (Builder $s) => $s->whereKey($user->id)))
            ->when(ConsoleScope::facilityIds($filters['facility_id'] ?? null), fn (Builder $q, array $ids) => $q->whereHas('facility', fn (Builder $f) => $f->whereIn('public_id', $ids)))
            ->when($filters['region_code'] ?? null, fn (Builder $q, string $code) => $q->whereHas('facility.region', fn (Builder $r) => $r->where('psgc_code', $code)))
            ->when($filters['patient'] ?? null, fn (Builder $q, string $id) => $q->whereHas('patient', fn (Builder $p) => $p->where('public_id', $id)));
    }

    public function show(Appointment $appointment): JsonResponse
    {
        Gate::authorize('manage', $appointment);

        return $this->respond($appointment);
    }

    public function transition(Request $request, Appointment $appointment, string $action, ChangeAppointmentStatus $change): JsonResponse
    {
        Gate::authorize('manage', $appointment);
        abort_unless(isset(self::ACTIONS[$action]), 404);

        $input = $request->validate(['reason' => [Rule::requiredIf(in_array($action, ['decline', 'cancel'], true)), 'nullable', 'string', 'max:300']]);

        return $this->respond($change->handle($appointment, self::ACTIONS[$action], $request->user(), $input['reason'] ?? null));
    }

    private function applyView(Builder $query, string $view): void
    {
        match ($view) {
            'requests' => $query->where('status', AppointmentStatus::Requested)->where('starts_at', '>', now()),
            'upcoming' => $query->where('status', AppointmentStatus::Confirmed)->where('ends_at', '>', now()->subHours(12)),
            // Finished ones, requests nobody answered in time, and confirmed visits whose
            // outcome (completed / missed) was never recorded.
            default => $query->where(fn (Builder $q) => $q
                ->whereIn('status', [AppointmentStatus::Declined, AppointmentStatus::Cancelled, AppointmentStatus::Completed, AppointmentStatus::NoShow])
                ->orWhere(fn (Builder $q) => $q->where('status', AppointmentStatus::Requested)->where('starts_at', '<=', now()))
                ->orWhere(fn (Builder $q) => $q->where('status', AppointmentStatus::Confirmed)->where('ends_at', '<=', now()->subHours(12)))),
        };
    }

    private function respond(Appointment $appointment): JsonResponse
    {
        $resource = new AppointmentResource($appointment->load([...self::RELATIONS, 'events.actor:id,name']));
        $resource->forStaff = true;

        return response()->json(['data' => $resource->resolve(request())]);
    }
}
