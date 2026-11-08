<?php

namespace App\Domain\Booking\Queue;

use App\Domain\Booking\Models\QueueTicket;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Support\FacilitySnapshot;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Today's walk-in queue at a facility. Numbers start at 1 each day and are handed out
 * under a lock on the facility row, so two staff adding walk-ins never get the same number.
 */
final class WalkInQueue
{
    /** Allowed moves: from status → statuses it may go to. */
    private const MOVES = [
        QueueTicket::WAITING => [QueueTicket::CALLED, QueueTicket::SKIPPED],
        QueueTicket::CALLED => [QueueTicket::SERVING, QueueTicket::DONE, QueueTicket::SKIPPED, QueueTicket::WAITING],
        QueueTicket::SERVING => [QueueTicket::DONE],
        QueueTicket::SKIPPED => [QueueTicket::WAITING],
        QueueTicket::DONE => [],
    ];

    /** $appointmentId links the number to a booked appointment that checked in at the desk. */
    public function issue(Facility $facility, User $staff, ?int $serviceId, ?string $name, ?string $mobile, ?int $appointmentId = null): QueueTicket
    {
        return DB::transaction(function () use ($facility, $staff, $serviceId, $name, $mobile, $appointmentId): QueueTicket {
            Facility::query()->whereKey($facility->id)->lockForUpdate()->first();
            $today = FacilitySnapshot::today();
            $next = (int) QueueTicket::query()->where('facility_id', $facility->id)->whereDate('queue_date', $today)->max('number') + 1;

            return QueueTicket::query()->create([
                'facility_id' => $facility->id,
                'service_id' => $serviceId,
                'appointment_id' => $appointmentId,
                'queue_date' => $today,
                'number' => $next,
                'name' => $name,
                'mobile' => $mobile,
                'status' => QueueTicket::WAITING,
                'created_by' => $staff->id,
            ]);
        });
    }

    /** Calls the lowest waiting number (optionally to a counter / window). Null when nobody is waiting. */
    public function callNext(Facility $facility, ?string $counter): ?QueueTicket
    {
        return DB::transaction(function () use ($facility, $counter): ?QueueTicket {
            $ticket = QueueTicket::query()
                ->where('facility_id', $facility->id)
                ->whereDate('queue_date', FacilitySnapshot::today())
                ->where('status', QueueTicket::WAITING)
                ->orderBy('number')
                ->lockForUpdate()
                ->first();

            if ($ticket === null) {
                return null;
            }

            $ticket->update(['status' => QueueTicket::CALLED, 'counter' => $counter, 'called_at' => now()]);

            return $ticket;
        });
    }

    public function move(QueueTicket $ticket, string $to, ?string $counter = null): QueueTicket
    {
        if (! in_array($to, self::MOVES[$ticket->status] ?? [], true)) {
            throw new ConflictHttpException("Number {$ticket->label()} is {$ticket->status} and cannot be marked {$to}.");
        }

        $ticket->update([
            'status' => $to,
            'counter' => $to === QueueTicket::CALLED ? ($counter ?? $ticket->counter) : $ticket->counter,
            'called_at' => $to === QueueTicket::CALLED ? now() : ($to === QueueTicket::WAITING ? null : $ticket->called_at),
            'finished_at' => in_array($to, [QueueTicket::DONE, QueueTicket::SKIPPED], true) ? now() : null,
        ]);

        return $ticket;
    }

    /**
     * What the public display shows: numbers only (never names).
     *
     * @return array{now_serving: list<array{number: string, counter: string|null, status: string}>, waiting: int, next: list<string>}
     */
    public function display(Facility $facility): array
    {
        $today = QueueTicket::query()->where('facility_id', $facility->id)->whereDate('queue_date', FacilitySnapshot::today());

        return [
            'now_serving' => (clone $today)->whereIn('status', [QueueTicket::CALLED, QueueTicket::SERVING])->orderByDesc('called_at')->limit(6)->get()
                ->map(fn (QueueTicket $t): array => ['number' => $t->label(), 'counter' => $t->counter, 'status' => $t->status])->all(),
            'waiting' => (clone $today)->where('status', QueueTicket::WAITING)->count(),
            'next' => (clone $today)->where('status', QueueTicket::WAITING)->orderBy('number')->limit(5)->get()->map(fn (QueueTicket $t) => $t->label())->all(),
        ];
    }
}
