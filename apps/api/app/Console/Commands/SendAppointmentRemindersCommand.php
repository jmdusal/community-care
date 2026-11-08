<?php

namespace App\Console\Commands;

use App\Domain\Booking\Actions\SendAppointmentReminders;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('communitycare:send-reminders')]
#[Description('Remind people of confirmed appointments in the next 24 hours (once each)')]
final class SendAppointmentRemindersCommand extends Command
{
    public function handle(SendAppointmentReminders $reminders): int
    {
        $count = $reminders->handle();
        $this->info("{$count} appointment reminders sent.");

        return self::SUCCESS;
    }
}
