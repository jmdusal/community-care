<?php

namespace App\Console\Commands;

use App\Domain\Facilities\Actions\SendFacilityCheckReminders;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('communitycare:remind-facility-checks')]
#[Description('Monthly: ask facility staff to check facilities not verified recently (one message per person)')]
final class SendFacilityCheckRemindersCommand extends Command
{
    public function handle(SendFacilityCheckReminders $reminders): int
    {
        ['people' => $people, 'facilities' => $facilities] = $reminders->handle();
        $this->info("Reminded {$people} people about {$facilities} facilities.");

        return self::SUCCESS;
    }
}
