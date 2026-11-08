<?php

namespace App\Domain\Services\Models;

use App\Domain\Facilities\Models\Facility;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['slug', 'name', 'category', 'description', 'archived_at'])]
class Service extends Model
{
    /** @return BelongsToMany<Facility, $this> */
    public function facilities(): BelongsToMany
    {
        return $this->belongsToMany(Facility::class, 'facility_services');
    }

    /**
     * Not archived: offered in pickers and public filters. Archived ones stay on the
     * facilities that already list them.
     *
     * @param  Builder<$this>  $query
     */
    #[Scope]
    protected function active(Builder $query): void
    {
        $query->whereNull('archived_at');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['archived_at' => 'datetime'];
    }
}
