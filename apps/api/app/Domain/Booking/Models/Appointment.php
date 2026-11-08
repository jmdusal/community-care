<?php

namespace App\Domain\Booking\Models;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Models\User;
use App\Domain\Services\Models\Service;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * An appointment request. Holds no medical information. contact_* is a copy of who the
 * appointment is for (patient account, guest, or a caller booked by staff).
 */
#[Fillable(['reference_code', 'patient_id', 'contact_name', 'contact_email', 'contact_mobile', 'facility_id', 'service_id', 'availability_id', 'starts_at', 'ends_at', 'status', 'source', 'booked_by', 'idempotency_key', 'status_reason', 'reminded_at', 'arrived_at'])]
class Appointment extends Model
{
    use HasUlids;

    public const SOURCE_ONLINE = 'online';

    public const SOURCE_GUEST = 'guest';

    public const SOURCE_STAFF = 'staff';

    /** @return list<string> */
    public function uniqueIds(): array
    {
        return ['public_id'];
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    /** @return BelongsTo<User, $this> */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    /** @return BelongsTo<User, $this> */
    public function bookedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'booked_by');
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

    /** @return BelongsTo<ClinicAvailability, $this> */
    public function availability(): BelongsTo
    {
        return $this->belongsTo(ClinicAvailability::class, 'availability_id');
    }

    /**
     * The queue number given when the patient checked in at the desk.
     *
     * @return HasOne<QueueTicket, $this>
     */
    public function queueTicket(): HasOne
    {
        return $this->hasOne(QueueTicket::class);
    }

    /** @return HasMany<AppointmentEvent, $this> */
    public function events(): HasMany
    {
        return $this->hasMany(AppointmentEvent::class)->orderBy('id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['status' => AppointmentStatus::class, 'starts_at' => 'datetime', 'ends_at' => 'datetime', 'reminded_at' => 'datetime', 'arrived_at' => 'datetime'];
    }
}
