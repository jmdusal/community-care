<?php

namespace App\Domain\Booking\Models;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Services\Models\Service;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A clinic-approved time slot with a seat limit. */
#[Fillable(['facility_id', 'service_id', 'starts_at', 'ends_at', 'capacity', 'booked_count', 'status', 'created_by'])]
class ClinicAvailability extends Model
{
    use HasUlids;

    public const OPEN = 'open';

    public const CANCELLED = 'cancelled';

    protected $table = 'clinic_availability';

    /** @var array<string, mixed> */
    protected $attributes = ['status' => 'open', 'booked_count' => 0];

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

    /** @return HasMany<Appointment, $this> */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'availability_id');
    }

    public function seatsLeft(): int
    {
        return max(0, $this->capacity - $this->booked_count);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['starts_at' => 'datetime', 'ends_at' => 'datetime', 'capacity' => 'integer', 'booked_count' => 'integer'];
    }
}
