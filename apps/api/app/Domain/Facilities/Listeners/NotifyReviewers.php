<?php

namespace App\Domain\Facilities\Listeners;

use App\Domain\Facilities\Events\FacilityChangeSubmitted;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Notifications\ChangeRequestNotification;
use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use App\Domain\Shared\Notifications\InAppNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Notification;

/** Tells active reviewers who cover every facility (verifiers and admins by default; not the submitter) that a change waits for review. */
final class NotifyReviewers implements ShouldQueue
{
    public int $tries = 3;

    public function handle(FacilityChangeSubmitted $event): void
    {
        $facility = Facility::query()->find($event->facilityId);

        $reviewers = User::query()
            ->where('status', 'active')
            ->whereKeyNot($event->actorId ?? 0)
            ->whereHas('roles', fn (Builder $q) => $q->whereIn('name', Role::namesGranting(Permission::FacilitiesReview, everywhere: true)))
            ->get();

        if ($facility === null || $reviewers->isEmpty()) {
            return;
        }

        Notification::send($reviewers, new ChangeRequestNotification(
            'A facility change needs review',
            $facility->name,
            'A change was proposed and needs a second person to approve or reject it.',
            '/admin/review-queue',
        ));

        Notification::send($reviewers, new InAppNotification('change_request', 'Change needs review', "{$facility->name}: a proposed change is waiting for a second reviewer.", '/admin/review-queue', ['change-requests', 'stats']));
    }
}
