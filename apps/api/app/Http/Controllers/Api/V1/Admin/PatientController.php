<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Identity\Actions\UpdateUserAccessAction;
use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\User;
use App\Http\Controllers\Controller;
use App\Http\Resources\AppointmentResource;
use App\Http\Support\ConsoleScope;
use App\Http\Support\Time;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Patient accounts in the console. System admins see every patient and can suspend or
 * reactivate an account. Facility admins and staff see only patients who have appointments
 * at their facilities, and only those appointments. The top-bar scope narrows the list
 * the same way (patients with appointments at that facility or region).
 */
final class PatientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('view-patients');
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:80'],
            'status' => ['nullable', Rule::in(['active', 'suspended'])],
            'facility_id' => ConsoleScope::FACILITY_RULE,
            'region_code' => ['nullable', 'digits:10'],
        ]);

        $visible = $this->appointmentScope($request->user(), $filters);
        $scoped = $visible !== null;

        $patients = User::query()
            ->whereHas('roles', fn (Builder $q) => $q->where('name', RoleName::Patient->value))
            ->when($scoped, fn (Builder $q) => $q->whereHas('appointments', $visible))
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->where('status', $status))
            ->when($filters['q'] ?? null, function (Builder $q, string $text): void {
                $like = '%'.addcslashes($text, '%_\\').'%';
                $q->where(fn (Builder $w) => $w->where('name', 'like', $like)->orWhere('email', 'like', $like)->orWhere('mobile', 'like', $like));
            })
            ->withCount(['appointments' => fn (Builder $q) => $q->when($scoped, $visible)])
            ->withCount(['appointments as upcoming_count' => fn (Builder $q) => $q->when($scoped, $visible)
                ->whereIn('status', [AppointmentStatus::Requested, AppointmentStatus::Confirmed])->where('starts_at', '>', now())])
            ->withMax(['appointments as last_appointment_at' => fn (Builder $q) => $q->when($scoped, $visible)], 'starts_at')
            ->orderBy('name')
            ->paginate(min(max($request->integer('per_page', 25), 1), 100));

        return response()->json([
            'data' => $patients->getCollection()->map(fn (User $patient): array => $this->present($patient))->values(),
            'meta' => ['page' => $patients->currentPage(), 'per_page' => $patients->perPage(), 'total' => $patients->total(), 'last_page' => $patients->lastPage(), 'can_manage' => $request->user()->hasPermission(Permission::PatientsManage)],
        ]);
    }

    public function show(Request $request, string $patient): JsonResponse
    {
        Gate::authorize('view-patients');
        $visible = $this->appointmentScope($request->user(), []);
        $found = $this->find($patient, $visible);

        $appointments = Appointment::query()
            ->with(['facility:id,public_id,name,address', 'service:id,slug,name', 'patient:id,public_id,name,email,mobile', 'bookedBy:id,name', 'queueTicket:id,appointment_id,number,status'])
            ->where('patient_id', $found->id)
            ->when($visible !== null, $visible)
            ->orderByDesc('starts_at')
            ->limit(100)
            ->get();

        return response()->json(['data' => [
            ...$this->present($found->loadCount('appointments')),
            'appointments' => $appointments->map(fn (Appointment $a) => tap(new AppointmentResource($a), fn (AppointmentResource $r) => $r->forStaff = true)->resolve($request))->values(),
        ]]);
    }

    /** Suspend (signs them out everywhere) or reactivate a patient account. System admins only. */
    public function status(Request $request, string $patient, UpdateUserAccessAction $access): JsonResponse
    {
        Gate::authorize('manage-patients');
        $input = $request->validate(['status' => ['required', Rule::in(['active', 'suspended'])]]);

        $found = $access->handle($this->find($patient, null), $request->user(), null, $input['status'], null);

        return response()->json(['data' => $this->present($found->loadCount('appointments'))]);
    }

    /**
     * Which appointments this person may see (null = all): facility admins and staff see their
     * facilities only; the top-bar scope narrows further.
     *
     * @param  array<string, mixed>  $filters
     * @return (callable(Builder<Appointment>): void)|null
     */
    private function appointmentScope(User $user, array $filters): ?callable
    {
        $mine = ! $user->seesAllFacilities();
        $facility = ConsoleScope::facilityIds($filters['facility_id'] ?? null);
        $region = $filters['region_code'] ?? null;

        if (! $mine && $facility === null && $region === null) {
            return null;
        }

        return function (Builder $q) use ($user, $mine, $facility, $region): void {
            $q->when($mine, fn (Builder $q) => $q->whereHas('facility.staff', fn (Builder $s) => $s->whereKey($user->id)))
                ->when($facility, fn (Builder $q, array $ids) => $q->whereHas('facility', fn (Builder $f) => $f->whereIn('public_id', $ids)))
                ->when($region, fn (Builder $q, string $code) => $q->whereHas('facility.region', fn (Builder $r) => $r->where('psgc_code', $code)));
        };
    }

    /** @param (callable(Builder<Appointment>): void)|null $visible */
    private function find(string $publicId, ?callable $visible): User
    {
        return User::query()
            ->where('public_id', $publicId)
            ->whereHas('roles', fn (Builder $q) => $q->where('name', RoleName::Patient->value))
            ->when($visible !== null, fn (Builder $q) => $q->whereHas('appointments', $visible))
            ->first() ?? throw new NotFoundHttpException;
    }

    /** @return array<string, mixed> */
    private function present(User $patient): array
    {
        return [
            'id' => $patient->public_id,
            'name' => $patient->name,
            'email' => $patient->email,
            'mobile' => $patient->mobile,
            'status' => $patient->status,
            'two_factor' => $patient->hasTwoFactor(),
            'joined_at' => Time::iso($patient->created_at),
            'last_active_at' => Time::iso($patient->last_active_at),
            'appointments' => $patient->appointments_count ?? 0,
            'upcoming' => $patient->upcoming_count ?? null,
            'last_appointment_at' => $patient->last_appointment_at === null ? null : Time::iso(now()->parse($patient->last_appointment_at)),
        ];
    }
}
