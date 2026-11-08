<?php

namespace App\Domain\HealthPrograms\Models;

use App\Domain\Facilities\Models\Facility;
use App\Domain\HealthPrograms\Enums\ProgramCategory;
use App\Domain\HealthPrograms\Enums\ProgramStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/** A public health campaign and the facilities taking part. */
#[Fillable(['title', 'category', 'summary', 'description', 'starts_on', 'ends_on', 'source_name', 'source_url', 'status', 'published_at', 'created_by', 'updated_by'])]
class HealthProgram extends Model
{
    use HasUlids;

    /** @var array<string, mixed> */
    protected $attributes = ['status' => 'draft'];

    /** @return list<string> */
    public function uniqueIds(): array
    {
        return ['public_id'];
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    /** @return BelongsToMany<Facility, $this> */
    public function facilities(): BelongsToMany
    {
        return $this->belongsToMany(Facility::class, 'program_facilities');
    }

    /** Published and not yet ended (today counts). @param Builder<self> $query */
    #[Scope]
    protected function current(Builder $query): void
    {
        $query->where('status', ProgramStatus::Published)
            ->where(fn (Builder $q) => $q->whereNull('ends_on')->orWhereDate('ends_on', '>=', now(config('communitycare.display_timezone'))->toDateString()));
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'category' => ProgramCategory::class,
            'status' => ProgramStatus::class,
            'starts_on' => 'date',
            'ends_on' => 'date',
            'published_at' => 'datetime',
        ];
    }
}
