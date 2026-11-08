<?php

namespace App\Domain\Facilities\Models;

use App\Domain\Identity\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A member of the public says something on a facility's page is wrong. */
#[Fillable(['facility_id', 'reason', 'details', 'contact', 'status', 'resolution_note', 'resolved_by', 'resolved_at', 'reporter_hash'])]
class FacilityReport extends Model
{
    use HasUlids;

    public const REASONS = [
        'phone_wrong' => 'Phone number does not work',
        'wrong_hours' => 'Opening hours are wrong',
        'closed_permanently' => 'Closed for good',
        'wrong_location' => 'Location or address is wrong',
        'wrong_services' => 'Services are wrong',
        'other' => 'Something else',
    ];

    public const OPEN = 'open';

    public const RESOLVED = 'resolved';

    public const DISMISSED = 'dismissed';

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

    /** @return BelongsTo<User, $this> */
    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['resolved_at' => 'datetime'];
    }
}
