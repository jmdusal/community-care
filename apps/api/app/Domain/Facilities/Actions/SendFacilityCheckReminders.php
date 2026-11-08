<?php

namespace App\Domain\Facilities\Actions;

use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Notifications\FacilityCheckReminder;
use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Models\User;
use App\Domain\Settings\Contracts\SettingsRepository;
use App\Domain\Shared\Notifications\InAppNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Once a month, nudges each facility's staff about their published facilities that have not
 * been verified for `verification.check_reminder_days` (default 30): one email and one bell
 * notification per person, listing their facilities. A facility is not reminded twice
 * within 25 days, so running it again the same month sends nothing new.
 */
final class SendFacilityCheckReminders
{
    public function __construct(private readonly SettingsRepository $settings) {}

    /** @return array{people: int, facilities: int} */
    public function handle(): array
    {
        $days = $this->settings->int('verification.check_reminder_days');

        $facilities = Facility::query()
            ->with(['staff' => fn ($q) => $q->where('status', 'active')->with('roles')])
            ->where('publication_status', PublicationStatus::Published)
            ->where(fn (Builder $q) => $q->whereNull('verified_at')->orWhere('verified_at', '<', now()->subDays($days)))
            ->where(fn (Builder $q) => $q->whereNull('check_reminded_at')->orWhere('check_reminded_at', '<', now()->subDays(25)))
            ->whereHas('staff')
            ->get();

        /** @var Collection<int, array{user: User, facilities: list<Facility>}> $byPerson */
        $byPerson = collect();
        foreach ($facilities as $facility) {
            foreach ($facility->staff as $user) {
                if (! $user->canAt(Permission::FacilitiesEdit, $facility)) {
                    continue;
                }
                $entry = $byPerson->get($user->id, ['user' => $user, 'facilities' => []]);
                $entry['facilities'][] = $facility;
                $byPerson->put($user->id, $entry);
            }
        }

        $reminded = collect();
        foreach ($byPerson as ['user' => $user, 'facilities' => $list]) {
            $items = array_map(fn (Facility $f): array => [
                'name' => $f->name,
                'last' => $f->verified_at?->timezone((string) config('communitycare.display_timezone'))->format('M j, Y') ?? 'never',
                'path' => "/admin/facilities?open={$f->public_id}",
            ], array_slice($list, 0, 10));

            $user->notify(new FacilityCheckReminder($items));
            $user->notify(new InAppNotification(
                'facility',
                count($items) === 1 ? "Monthly check: {$items[0]['name']}" : 'Monthly check: '.count($list).' facilities',
                'Please confirm hours, phone numbers and services are still correct.',
                count($items) === 1 ? $items[0]['path'] : '/admin/facilities',
            ));
            $reminded = $reminded->merge(array_map(fn (Facility $f) => $f->id, $list));
        }

        Facility::query()->whereKey($reminded->unique()->all())->update(['check_reminded_at' => now()]);

        return ['people' => $byPerson->count(), 'facilities' => $reminded->unique()->count()];
    }
}
