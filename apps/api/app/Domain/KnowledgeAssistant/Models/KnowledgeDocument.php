<?php

namespace App\Domain\KnowledgeAssistant\Models;

use App\Domain\Identity\Models\User;
use App\Domain\KnowledgeAssistant\Enums\DocumentStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Approved public health information the assistant may quote. */
#[Fillable(['title', 'body', 'topic', 'source_name', 'source_url', 'status', 'verified_at', 'published_at', 'created_by', 'updated_by'])]
class KnowledgeDocument extends Model
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

    /** @return BelongsTo<User, $this> */
    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /** @param Builder<self> $query */
    #[Scope]
    protected function published(Builder $query): void
    {
        $query->where('status', DocumentStatus::Published);
    }

    public function isStale(int $staleAfterDays): bool
    {
        return $this->verified_at === null || $this->verified_at->lt(now()->subDays($staleAfterDays));
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'status' => DocumentStatus::class,
            'verified_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }
}
