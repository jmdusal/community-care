<?php

namespace App\Domain\Facilities\Listeners;

use App\Domain\Facilities\Events\FacilityApproved;
use App\Domain\Facilities\Events\FacilityRejected;
use App\Domain\Facilities\Models\FacilityChangeRequest;
use App\Domain\Facilities\Notifications\ChangeRequestNotification;
use App\Domain\Shared\Notifications\InAppNotification;
use Illuminate\Contracts\Queue\ShouldQueue;

/** Tells the person who proposed a change whether it was approved or rejected. */
final class NotifySubmitter implements ShouldQueue
{
    public int $tries = 3;

    public function handle(FacilityApproved|FacilityRejected $event): void
    {
        $request = FacilityChangeRequest::query()->with(['submitter', 'facility'])->where('public_id', $event->changeRequestPublicId)->first();

        if ($request?->submitter === null || ! $request->submitter->isActive()) {
            return;
        }

        $approved = $event instanceof FacilityApproved;

        $request->submitter->notify(new ChangeRequestNotification(
            $approved ? 'Your facility change was approved' : 'Your facility change was rejected',
            $request->facility->name,
            $approved ? 'It is now live in the directory.' : 'Reason: '.($request->reason ?? 'not given'),
            '/admin/facilities',
        ));

        $request->submitter->notify(new InAppNotification(
            'change_request',
            $approved ? 'Change approved' : 'Change rejected',
            $approved ? "{$request->facility->name}: your change is now live." : "{$request->facility->name}: ".($request->reason ?? 'no reason given'),
            '/admin/facilities',
            ['admin-facilities', 'change-requests'],
        ));
    }
}
