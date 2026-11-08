<?php

namespace App\Console\Commands;

use App\Domain\Facilities\Actions\MarkFacilitiesStaleAction;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('communitycare:mark-stale')]
#[Description('Mark verified facilities older than the verification.stale_after_days setting as stale')]
final class MarkStaleFacilitiesCommand extends Command
{
    public function handle(MarkFacilitiesStaleAction $markStale): int
    {
        $count = $markStale->handle();
        $this->info("{$count} facilities marked stale.");

        return self::SUCCESS;
    }
}
