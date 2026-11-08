<?php

namespace App\Domain\Booking\Models;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Services\Models\Service;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A walk-in queue number for one facility on one day: waiting → called → serving → done,
 * or skipped (can be put back in line). No medical information.
 */
#[Fillable(['facility_id', 'service_id', 'appointment_id', 'queue_date', 'number', 'name', 'mobile', 'status', 'counter', 'called_at', 'finished_at', 'created_by'])]
class QueueTicket extends Model
{
    use HasUlids;

    public const WAITING = 'waiting';

    public const CALLED = 'called';

    public const SERVING = 'serving';

    public const DONE = 'done';

    public const SKIPPED = 'skipped';

    /** @return list<string> */
    public function uniqueIds(): array
    {
        return ['public_id'];
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    /** @return BelongsTo<Facility, $this> */
    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    /** @return BelongsTo<Service, $this> */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /** @return BelongsTo<Appointment, $this> */
    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    /** "A-007" style label shown to patients and on the display. */
    public function label(): string
    {
        return str_pad((string) $this->number, 3, '0', STR_PAD_LEFT);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['queue_date' => 'date', 'called_at' => 'datetime', 'finished_at' => 'datetime'];
    }
}
