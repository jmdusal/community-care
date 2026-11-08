<?php

namespace App\Domain\Facilities\Models;

use App\Domain\Facilities\Enums\ChangeOrigin;
use App\Domain\Facilities\Enums\ChangeRequestStatus;
use App\Domain\Identity\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['facility_id', 'submitted_by', 'origin', 'changes', 'note', 'status', 'reviewed_by', 'reviewed_at', 'reason'])]
class FacilityChangeRequest extends Model
{
    use HasUlids;

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
    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'changes' => 'array',
            'origin' => ChangeOrigin::class,
            'status' => ChangeRequestStatus::class,
            'reviewed_at' => 'datetime',
        ];
    }
}
