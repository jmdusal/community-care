<?php

namespace App\Domain\DataImports\Models;

use App\Domain\DataImports\Enums\ImportBatchStatus;
use App\Domain\DataImports\Enums\ImportKind;
use App\Domain\DataImports\Enums\ImportStep;
use App\Domain\Identity\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'source_name', 'kind', 'source_version', 'file_path', 'original_filename', 'usage_terms', 'started_by',
    'status', 'current_step', 'records_processed', 'counts', 'error_summary', 'started_at', 'finished_at',
    'published_at', 'published_by',
])]
class ImportBatch extends Model
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

    /** @return HasMany<ImportStagingRecord, $this> */
    public function records(): HasMany
    {
        return $this->hasMany(ImportStagingRecord::class);
    }

    /** @return BelongsTo<User, $this> */
    public function starter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'started_by');
    }

    /** @return BelongsTo<User, $this> */
    public function publisher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'kind' => ImportKind::class,
            'status' => ImportBatchStatus::class,
            'current_step' => ImportStep::class,
            'counts' => 'array',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }
}
