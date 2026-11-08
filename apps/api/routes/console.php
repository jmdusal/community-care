<?php

use Illuminate\Support\Facades\Schedule;

/*
| Scheduled jobs. Locally: php artisan schedule:work. In production: one cron
| entry running "php artisan schedule:run" every minute.
*/

Schedule::command('communitycare:mark-stale')
    ->dailyAt('02:00')
    ->timezone(config('communitycare.display_timezone'))
    ->withoutOverlapping()
    ->onOneServer();

// Recovery (phase 8): a nightly backup, and a weekly proof that the newest one restores.
Schedule::command('communitycare:backup')->dailyAt('01:30')->timezone('Asia/Manila')->withoutOverlapping()->onOneServer();
Schedule::command('communitycare:restore-check')->weeklyOn(0, '03:00')->timezone('Asia/Manila')->withoutOverlapping()->onOneServer();

// Booking: remind people the day before a confirmed appointment.
Schedule::command('communitycare:send-reminders')->hourly()->withoutOverlapping()->onOneServer();

// Monthly nudge to facility staff to check their facilities' details (1st of the month, 8 AM).
Schedule::command('communitycare:remind-facility-checks')->monthlyOn(1, '08:00')->timezone('Asia/Manila')->withoutOverlapping()->onOneServer();
