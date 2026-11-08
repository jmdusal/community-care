<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Booking\Actions\CheckInAppointment;
use App\Domain\Booking\Models\QueueTicket;
use App\Domain\Booking\Queue\WalkInQueue;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Support\FacilitySnapshot;
use App\Domain\Services\Models\Service;
use App\Http\Controllers\Controller;
use App\Http\Support\PhilippineMobile;
use App\Http\Support\Time;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Today's walk-in queue at one facility (staff who handle appointments there).
 * POST …/queue adds a walk-in, …/queue/call-next calls the lowest waiting number,
 * and /admin/queue/{ticket}/{action} moves one number along.
 */
final class QueueController extends Controller
{
    private const ACTIONS = [
        'call' => QueueTicket::CALLED,
        'serve' => QueueTicket::SERVING,
        'done' => QueueTicket::DONE,
        'skip' => QueueTicket::SKIPPED,
        'requeue' => QueueTicket::WAITING,
    ];

    public function __construct(private readonly WalkInQueue $queue) {}

    public function index(Facility $facility): JsonResponse
    {
        Gate::authorize('manage-schedule', $facility);

        $tickets = QueueTicket::query()
            ->with(['service:id,slug,name', 'appointment:id,public_id,reference_code,starts_at'])
            ->where('facility_id', $facility->id)
            ->whereDate('queue_date', FacilitySnapshot::today())
            ->orderBy('number')
            ->get();

        return response()->json([
            'data' => $tickets->map(fn (QueueTicket $ticket) => $this->present($ticket))->values(),
            'meta' => [
                'date' => FacilitySnapshot::today(),
                'counts' => collect([QueueTicket::WAITING, QueueTicket::CALLED, QueueTicket::SERVING, QueueTicket::DONE, QueueTicket::SKIPPED])
                    ->mapWithKeys(fn (string $status) => [$status => $tickets->where('status', $status)->count()]),
                'display' => $this->queue->display($facility),
            ],
        ]);
    }

    public function store(Request $request, Facility $facility): JsonResponse
    {
        Gate::authorize('manage-schedule', $facility);
        $request->merge(['mobile' => PhilippineMobile::normalize($request->input('mobile'))]);
        $input = $request->validate([
            'name' => ['nullable', 'string', 'max:120'],
            'mobile' => ['nullable', PhilippineMobile::RULE],
            'service' => ['nullable', 'string', Rule::exists('services', 'slug')],
        ], ['mobile.regex' => PhilippineMobile::MESSAGE]);

        $serviceId = isset($input['service']) ? Service::query()->where('slug', $input['service'])->value('id') : null;
        $ticket = $this->queue->issue($facility, $request->user(), $serviceId, $input['name'] ?? null, $input['mobile'] ?? null);

        return response()->json(['data' => $this->present($ticket->load(['service:id,slug,name', 'appointment:id,public_id,reference_code,starts_at']))], 201);
    }

    /**
     * Desk check-in: the reference code from the patient's QR (or typed). Gives a confirmed
     * appointment for today a queue number; scanning again returns the same number (200).
     */
    public function checkIn(Request $request, Facility $facility, CheckInAppointment $checkIn): JsonResponse
    {
        Gate::authorize('manage-schedule', $facility);
        $input = $request->validate(['code' => ['required', 'string', 'max:40']]);

        [$appointment, $ticket, $created] = $checkIn->handle($facility, $input['code'], $request->user());

        return response()->json(['data' => [
            'ticket' => $this->present($ticket->load(['service:id,slug,name', 'appointment:id,public_id,reference_code,starts_at'])),
            'appointment' => [
                'id' => $appointment->public_id,
                'reference_code' => $appointment->reference_code,
                'name' => $ticket->name,
                'starts_at' => Time::iso($appointment->starts_at),
                'arrived_at' => Time::iso($appointment->arrived_at),
            ],
            'already_checked_in' => ! $created,
        ]], $created ? 201 : 200);
    }

    public function callNext(Request $request, Facility $facility): JsonResponse
    {
        Gate::authorize('manage-schedule', $facility);
        $input = $request->validate(['counter' => ['nullable', 'string', 'max:30']]);

        $ticket = $this->queue->callNext($facility, $input['counter'] ?? null);
        abort_if($ticket === null, 404, 'Nobody is waiting.');

        return response()->json(['data' => $this->present($ticket->load(['service:id,slug,name', 'appointment:id,public_id,reference_code,starts_at']))]);
    }

    public function move(Request $request, QueueTicket $ticket, string $action): JsonResponse
    {
        Gate::authorize('manage-schedule', $ticket->facility);
        abort_unless(isset(self::ACTIONS[$action]), 404);
        $input = $request->validate(['counter' => ['nullable', 'string', 'max:30']]);

        return response()->json(['data' => $this->present($this->queue->move($ticket, self::ACTIONS[$action], $input['counter'] ?? null)->load(['service:id,slug,name', 'appointment:id,public_id,reference_code,starts_at']))]);
    }

    /** @return array<string, mixed> */
    private function present(QueueTicket $ticket): array
    {
        return [
            'id' => $ticket->public_id,
            'number' => $ticket->label(),
            'name' => $ticket->name,
            'mobile' => $ticket->mobile,
            'service' => $ticket->service === null ? null : ['slug' => $ticket->service->slug, 'name' => $ticket->service->name],
            // Booked patients who checked in with their QR code (null for walk-ins).
            'appointment' => $ticket->appointment === null ? null : [
                'id' => $ticket->appointment->public_id,
                'reference_code' => $ticket->appointment->reference_code,
                'starts_at' => Time::iso($ticket->appointment->starts_at),
            ],
            'status' => $ticket->status,
            'counter' => $ticket->counter,
            'called_at' => Time::iso($ticket->called_at),
            'finished_at' => Time::iso($ticket->finished_at),
            'created_at' => Time::iso($ticket->created_at),
        ];
    }
}
