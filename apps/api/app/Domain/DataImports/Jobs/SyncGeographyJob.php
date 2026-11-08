<?php

namespace App\Domain\DataImports\Jobs;

use App\Domain\DataImports\Actions\SyncGeographyAction;
use App\Domain\Identity\Models\User;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/** Runs the PSGC download in the background; only one sync at a time. */
final class SyncGeographyJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 300;

    public int $uniqueFor = 600;

    public function __construct(public readonly ?int $actorId) {}

    public function handle(SyncGeographyAction $sync): void
    {
        $sync->handle($this->actorId === null ? null : User::query()->find($this->actorId));
    }
}
